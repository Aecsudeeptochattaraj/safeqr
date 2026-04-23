import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import sharp from 'sharp';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 0. Body Parsers & Upload Config
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // Increased to 15MB
  });

  // 1. GLOBAL REQUEST TRACER (VERY TOP)
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const cleanUrl = req.url.split('?')[0];
    console.log(`[SYS-TRACE] [${req.method}] ${cleanUrl} (Original: ${req.originalUrl})`);
    next();
  });

  // 2. HARDENED API LAYER (BEFORE VITE)
  const api = express.Router();
  
  api.use(express.json()); // Only for API routes

  api.get('/test', (req, res) => {
    console.log("[API-PING] Test OK");
    res.json({ live: true, node: process.version });
  });

  api.post('/submitPayment', (req, res) => {
    console.log("[API-FLOW] submitPayment Start");
    upload.single('screenshot')(req, res, async (multerErr) => {
      if (multerErr) {
        console.error("[API-FLOW] Multer Err:", multerErr);
        return res.status(400).json({ error: 'FILE_FAULT', details: multerErr.message });
      }

      try {
        const { transactionId, userId } = req.body;
        if (!transactionId || !userId || !req.file) {
          console.warn("[API-FLOW] Validation Failed", { transactionId, userId, hasFile: !!req.file });
          return res.status(400).json({ error: 'INCOMPLETE_PAYLOAD', message: 'Missing fields' });
        }

        console.log(`[API-FLOW] Processing image (${req.file.size} bytes)`);
        
        let scrubbedData = '';
        try {
          const buffer = await sharp(req.file.buffer)
            .resize(800, 800, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toBuffer();
          scrubbedData = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        } catch (e) {
          console.warn("[API-FLOW] Sharp fallback");
          scrubbedData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        return res.status(200).json({
          success: true,
          scrubbedImage: scrubbedData,
          transactionId
        });
      } catch (fataErr: any) {
        console.error("[API-FLOW] Fatal:", fataErr);
        return res.status(500).json({ error: 'INTERNAL_SECURITY_FAULT', details: fataErr.message });
      }
    });
  });

  // Catch unmatched API calls with JSON 404
  api.all('*', (req, res) => {
    console.warn(`[API-MISS] ${req.method} ${req.url}`);
    res.status(404).json({ error: 'API_ENDPOINT_NOT_FOUND' });
  });

  app.use('/api', api);

  // 3. VITE / SPA FALLBACK (AFTER API)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false 
      },
      appType: "spa",
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
