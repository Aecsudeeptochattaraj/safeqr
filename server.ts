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
    const cleanUrl = req.url.split('?')[0];
    if (cleanUrl.startsWith('/api/')) {
       console.log(`[API-CRITICAL-TRACE] [${req.method}] ${cleanUrl}`);
    }
    next();
  });

  // 2. HARDENED API LAYER (MOUNTED DIRECTLY ON APP FOR MAX PRIORITY)
  app.post('/api/submitPayment', (req, res) => {
    console.log("[SECURITY-NODE] Incoming Submission...");
    upload.single('screenshot')(req, res, async (multerErr) => {
      if (multerErr) {
        console.error("[SECURITY-NODE] Multer Fault:", multerErr);
        return res.status(400).json({ error: 'FILE_UPLOAD_FAILED', message: multerErr.message });
      }

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
