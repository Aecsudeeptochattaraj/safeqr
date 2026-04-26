import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import sharp from 'sharp';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 0. Body Parsers & Upload Config
  app.use(express.json({ limit: '10mb' }));
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // Increased to 15MB
  });

  // 1. GLOBAL REQUEST TRACER (VERY TOP)
  app.use((req, res, next) => {
    const cleanUrl = req.url.split('?')[0];
    if (cleanUrl.startsWith('/api/')) {
       console.log(`[API-CRITICAL-TRACE] [${req.method}] ${cleanUrl}`);
    }
    next();
  });

  // 2. HARDENED API LAYER
  app.post('/api/submitPayment', upload.single('screenshot'), async (req, res) => {
    console.log("[SECURITY-NODE] Incoming Submission...");
    
    try {
      const { transactionId, userId } = req.body;
      if (!transactionId || !userId || !req.file) {
        console.warn("[SECURITY-NODE] Data check failed", { transactionId, userId, file: !!req.file });
        return res.status(400).json({ error: 'DATA_MALFORMED', message: 'All fields + Screenshot required' });
      }

      console.log(`[SECURITY-NODE] Scrubbing image: ${req.file.size} bytes`);
      
      let processedData = '';
      try {
        const buffer = await sharp(req.file.buffer)
          .resize(800, 800, { fit: 'inside' })
          .jpeg({ quality: 80 })
          .toBuffer();
        processedData = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      } catch (e) {
        console.warn("[SECURITY-NODE] Process failure, fallback to raw");
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
      return res.status(500).json({ error: 'NODE_FAILURE', details: fatal.message });
    }
  });

  // --- AI SCANNING PROXIES (LEGACY / DEPRECATED - Preferred Frontend) ---
  app.post('/api/scanPlate', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'IMAGE_REQUIRED' });
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'GEMINI_KEY_MISSING' });

      const ai = new GoogleGenAI({ apiKey });
      
      const buf1 = await sharp(req.file.buffer)
        .resize(1024, 1024, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [
            { text: "Extract the vehicle license plate number from this image. Only return the alphanumeric plate number, nothing else. If not found, return 'NOT_FOUND'." },
            {
              inlineData: {
                data: buf1.toString('base64'),
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
      res.status(500).json({ error: 'SCAN_FAILED', details: err.message });
    }
  });

  app.post('/api/scanVehicleDetails', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'IMAGE_REQUIRED' });
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'GEMINI_KEY_MISSING' });

      const ai = new GoogleGenAI({ apiKey });
      
      const buf2 = await sharp(req.file.buffer)
        .resize(1024, 1024, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [
            { text: `Extract technical vehicle details from this image. 
               Return a JSON object with keys: plate (the number), brand (KIA, HYUNDAI, etc), color (RED, WHITE, etc), and type (CAR, BIKE, SCOOTER).
               If not visible, use value "NOT_FOUND". Only return JSON.` 
            },
            {
              inlineData: {
                data: buf2.toString('base64'),
                mimeType: 'image/jpeg'
              }
            }
          ]
        }]
      });

      const text = result.text?.replace(/```json|```/g, '').trim() || '{}';
      try {
        const json = JSON.parse(text);
        res.json(json);
      } catch (e) {
        res.status(500).json({ error: 'PARSING_FAILED', raw: text });
      }
    } catch (err: any) {
      console.error("[SCAN-NODE] Details AI Error:", err);
      res.status(500).json({ error: 'SCAN_FAILED', details: err.message });
    }
  });

  app.get('/api/test', (req, res) => res.json({ status: 'active', ts: Date.now() }));

  // 3. VITE / SPA FALLBACK (AFTER API)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false 
      },
      appType: "spa",
      optimizeDeps: {
        include: []
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Catch-all route for SPA - ONLY for GET requests that don't start with /api/
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Final API route handler
  app.all('/api/*', (req, res) => {
    return res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found.` });
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: 'CRITICAL_SERVER_ERROR', message: err.message });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BOOT] Server ready on http://localhost:${PORT}`);
  });
}

console.log("[INIT] Starting server script...");
startServer().catch(err => {
  console.error("[FATAL] Failed to start server:", err);
});
