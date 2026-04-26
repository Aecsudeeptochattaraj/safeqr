import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Lazy sharp loader to prevent crash if native binaries are missing in serverless
async function processImage(buffer: Buffer, mimetype: string): Promise<string> {
  try {
    const { default: sharpInstance } = await import('sharp');
    const processed = await sharpInstance(buffer)
      .resize(800, 800, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${processed.toString('base64')}`;
  } catch (e) {
    console.warn("[SERVER] Sharp processing failed (likely missing native binary), using raw fallback.");
    return `data:${mimetype};base64,${buffer.toString('base64')}`;
  }
}

async function processAiImage(buffer: Buffer): Promise<string> {
  try {
    const { default: sharpInstance } = await import('sharp');
    const processed = await sharpInstance(buffer)
      .resize(1024, 1024, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();
    return processed.toString('base64');
  } catch (e) {
    return buffer.toString('base64');
  }
}

// 1. GLOBAL REQUEST TRACER
app.use((req, res, next) => {
  const cleanUrl = req.url.split('?')[0];
  if (cleanUrl.startsWith('/api/')) {
     console.log(`[API-TRACE] [${req.method}] ${cleanUrl}`);
  }
  next();
});

// 2. HARDENED API LAYER
const apiHandler = async (req: express.Request, res: express.Response) => {
  console.log("[SECURITY-NODE] Processing Payment Submission...");
  try {
    const { transactionId, userId } = req.body;
    if (!transactionId || !userId || !req.file) {
      return res.status(400).json({ error: 'DATA_MALFORMED', message: 'Transaction ID, User ID, and Screenshot are required.' });
    }

    const processedData = await processImage(req.file.buffer, req.file.mimetype);

    return res.status(200).json({
      success: true,
      scrubbedImage: processedData,
      transactionId
    });
  } catch (fatal: any) {
    console.error("[SECURITY-NODE] Critical Error:", fatal);
    return res.status(500).json({ error: 'SERVER_FAULT', message: fatal.message });
  }
};

app.post(['/api/submitPayment', '/submitPayment'], upload.single('screenshot'), apiHandler);

// --- AI SCANNING PROXIES ---
const plateHandler = async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'IMAGE_REQUIRED' });
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_KEY_MISSING' });

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const base64Image = await processAiImage(req.file.buffer);

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash", 
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
};

app.post(['/api/scanPlate', '/scanPlate'], upload.single('image'), plateHandler);

const detailsHandler = async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'IMAGE_REQUIRED' });
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_KEY_MISSING' });

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const base64Image = await processAiImage(req.file.buffer);

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
};

app.post(['/api/scanVehicleDetails', '/scanVehicleDetails'], upload.single('image'), detailsHandler);

app.get(['/api/ping', '/ping'], (req, res) => res.json({ status: 'ok', v: '2.2' }));
app.get(['/api/test', '/test'], (req, res) => res.json({ status: 'active', ts: Date.now() }));

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
export { app }; 
export default app;

// Initial setup and listen
async function bootstrap() {
  // Only setup Vite in non-Vercel environments (Local/Cloud Run)
  if (!process.env.VERCEL) {
    await setupVite();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[BOOT] Server ready on port ${PORT} (Env: ${process.env.NODE_ENV || 'development'})`);
    });
  } else {
    // On Vercel, we don't need Vite server, but we might need to serve static files
    // The 'setupVite' call for production mode is handled by the Vercel rewrite to 'index.html'
    // but just in case we are running the function:
    if (process.env.NODE_ENV === "production") {
       const distPath = path.join(process.cwd(), 'dist');
       app.use(express.static(distPath));
    }
  }
}

// Only execute bootstrap if we are NOT on Vercel
// On Vercel, the function is started by the platform importing the default export
if (!process.env.VERCEL) {
  bootstrap().catch(err => {
    console.error("[FATAL] Server failed to start:", err);
  });
}
