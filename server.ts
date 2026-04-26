import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// 0. Body Parsers & Upload Config
app.use(express.json({ limit: '10mb' }));
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// 1. GLOBAL REQUEST TRACER
app.use((req, res, next) => {
  const cleanUrl = req.url.split('?')[0];
  if (cleanUrl.startsWith('/api/')) {
     console.log(`[API-TRACE] [${req.method}] ${cleanUrl}`);
  }
  next();
});

// 2. HARDENED API LAYER
const apiRouter = express.Router();

apiRouter.post('/submitPayment', upload.single('screenshot'), async (req, res) => {
  console.log("[SECURITY-NODE] Incoming Submission...");
  console.log("[SECURITY-NODE] Headers:", req.headers['content-type']);
  console.log("[SECURITY-NODE] Body keys:", Object.keys(req.body || {}));
  
  try {
    const { transactionId, userId } = req.body;
    if (!transactionId || !userId || !req.file) {
      console.warn("[SECURITY-NODE] Data check failed", { transactionId, userId, file: !!req.file });
      return res.status(400).json({ error: 'DATA_MALFORMED', message: 'Transaction ID, User ID, and Screenshot are required.' });
    }

    console.log(`[SECURITY-NODE] Scrubbing image: ${req.file.size} bytes`);
    
    let processedData = '';
    try {
      // Use sharp but with a catch to fallback to raw if native libs fail in serverless
      const buffer = await sharp(req.file.buffer)
        .resize(800, 800, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
      processedData = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } catch (e) {
      console.warn("[SECURITY-NODE] Sharp processing failed, using raw fallback", e);
      processedData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    console.log("[SECURITY-NODE] Success");
    return res.status(200).json({
      success: true,
      scrubbedImage: processedData,
      transactionId
    });
  } catch (fatal: any) {
    console.error("[SECURITY-NODE] Critical Error:", fatal);
    return res.status(500).json({ error: 'SERVER_FAULT', message: fatal.message });
  }
});

// --- AI SCANNING PROXIES ---
apiRouter.post('/scanPlate', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'IMAGE_REQUIRED' });
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_KEY_MISSING' });

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
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
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Extract the vehicle license plate number from this image. Only return the alphanumeric plate number, nothing else. If not found, return 'NOT_FOUND'." },
          {
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg'
            }
          }
        ]
      }
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

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
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
      model: "gemini-3-flash-preview",
      contents: {
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
      }
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

// Register API Router
app.use('/api', apiRouter);

// Strict 404 for any other /api calls to prevent HTML fallback
app.all('/api/*', (req, res) => {
  console.warn(`[SERVER] 404 on ${req.method} ${req.path}`);
  res.status(404).json({ error: 'NOT_FOUND', message: `API route ${req.method} ${req.path} not found` });
});

// 2.1 GLOBAL ERROR HANDLER
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[SERVER-CRITICAL]", err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message || 'An unexpected server error occurred' });
  }
  next(err);
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

// 4. Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[FATAL-ERROR]", err);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: err.message });
});

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
