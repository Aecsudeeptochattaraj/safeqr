import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// 0. Body Parsers & Upload Config
app.use(express.json({ limit: '2mb' })); // Reduced JSON limit to prevent large string attacks
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB hard limit
});

// 1. GLOBAL REQUEST TRACER & SANITIZER
app.use((req, res, next) => {
  const cleanUrl = req.url.split('?')[0];
  if (cleanUrl.startsWith('/api/')) {
     console.log(`[GATEWAY] ${req.method} ${cleanUrl}`);
  }
  // Prevent caching of API responses to stay fresh
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// 2. HARDENED API LAYER
const apiRouter = express.Router();

// Middleware: Strict JSON and No-Cache for API
apiRouter.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

apiRouter.post('/submitPayment', async (req, res) => {
  const rid = Math.random().toString(36).substring(7);
  console.log(`[API-IN] [${rid}] submitPayment. Body:`, { tid: req.body?.transactionId, uid: req.body?.userId });
  
  try {
    const { transactionId, userId } = req.body;
    if (!transactionId || !userId) {
      console.warn(`[API-FAIL] [${rid}] Missing core data`);
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Incomplete submission. IDs missing.' });
    }

    return res.status(200).json({
      success: true,
      scrubbedImage: null,
      transactionId,
      rid
    });
  } catch (err: any) {
    console.error(`[API-CRASH] [${rid}]`, err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Internal processing failure' });
  }
});

// --- AI SCANNING PROXIES ---
apiRouter.post('/scanPlate', upload.single('image'), async (req, res) => {
  console.log("[API] scanPlate hit");
  try {
    if (!req.file) return res.status(400).json({ error: 'IMAGE_REQUIRED' });
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_KEY_MISSING' });

    const ai = new GoogleGenAI({ apiKey });
    
    let base64Image = '';
    try {
      const buf = await sharp(req.file.buffer)
        .resize(1024, 1024, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
      base64Image = buf.toString('base64');
    } catch (e) {
      base64Image = req.file.buffer.toString('base64');
    }

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: 'user',
        parts: [
          { text: "Extract the vehicle license plate number from this image. Only return the alphanumeric plate number, nothing else. If not found, return 'NOT_FOUND'." },
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg'
            }
          }
        ]
      }]
    });

    const text = result.text?.trim() || '';
    res.json({ vehicleNumber: text === 'NOT_FOUND' ? '' : text });
  } catch (err: any) {
    console.error("[SCAN-NODE] AI Error:", err);
    res.status(500).json({ error: 'SCAN_FAILED', message: err.message });
  }
});

apiRouter.post('/scanVehicleDetails', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'IMAGE_REQUIRED' });
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_KEY_MISSING' });

    const ai = new GoogleGenAI({ apiKey });
    
    let base64Image = '';
    try {
      const buf = await sharp(req.file.buffer)
        .resize(1024, 1024, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
      base64Image = buf.toString('base64');
    } catch (e) {
      base64Image = req.file.buffer.toString('base64');
    }

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: 'user',
        parts: [
          { text: `Extract technical vehicle details from this image. 
             Return a JSON object with keys: plate (the number), brand (KIA, HYUNDAI, etc), color (RED, WHITE, etc), and type (CAR, BIKE, SCOOTER).
             If not visible, use value "NOT_FOUND". Only return JSON.` 
          },
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg'
            }
          }
        ]
      }]
    });

    let text = result.text?.trim() || '{}';
    text = text.replace(/```json|```/g, '').trim();
    try {
      const json = JSON.parse(text);
      res.json(json);
    } catch (e) {
      res.status(500).json({ error: 'PARSING_FAILED', message: 'Failed to parse AI response' });
    }
  } catch (err: any) {
    console.error("[SCAN-NODE] Details AI Error:", err);
    res.status(500).json({ error: 'SCAN_FAILED', message: err.message });
  }
});

apiRouter.get('/test', (req, res) => res.json({ status: 'active', ts: Date.now() }));

// --- EMAIL ENGINE (FREE / GMAIL SMTP) ---
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      console.warn("[MAIL] Credentials missing. Email functionality will be mocked.");
      return null;
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }
  return transporter;
};

apiRouter.post('/send-email', async (req, res) => {
  const { to, subject, html, previewText } = req.body;
  
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Recipient, subject, and content are required.' });
  }

  const mailer = getTransporter();
  
  if (!mailer) {
    console.log(`[MAIL-MOCK] To: ${to}, Subject: ${subject}`);
    return res.json({ success: true, message: 'Email mocked (Credentials missing)', mocked: true });
  }

  try {
    const userEmail = process.env.GMAIL_USER;
    await mailer.sendMail({
      from: `"MyParkSaathi" <${userEmail}>`,
      to,
      subject,
      html,
      text: previewText || subject // Fallback for clients without HTML support
    });
    
    console.log(`[MAIL-SUCCESS] Sent to ${to}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[MAIL-ERROR]", err);
    res.status(500).json({ error: 'EMAIL_FAILED', message: err.message });
  }
});

// Global API Error Handler - MUST BE LAST in the router to catch middleware errors (like Multer)
apiRouter.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[API-ERROR-GATE] Caught error:", err.message);
  res.status(err.status || 500).json({ 
    error: 'API_CRASH', 
    message: err.message || 'A critical server error occurred.',
    code: err.code || 'UNKNOWN'
  });
});

// Mount the router
app.use('/api', apiRouter);

// Standard API 404 handler to prevent index.html fallback for /api/*
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API_NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// 3. PRODUCTION STATIC SERVING / DEVELOPMENT MIDDLEWARE
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Export for Vercel
export default app;

// Initial setup and listen
async function bootstrap() {
  await setupVite();
  
  // Only listen if not on Vercel (Cloud Run / Local)
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[BOOT] Server ready on port ${PORT} (Env: ${process.env.NODE_ENV || 'development'})`);
    });
  }
}

bootstrap().catch(err => {
  console.error("[FATAL] Server failed to start:", err);
});
