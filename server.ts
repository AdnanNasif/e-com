import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import apiRouter from './server/routes/api';

const app = express();

// Trust proxy for accurate client IP (behind Nginx/Cloud Run/Vercel)
app.set('trust proxy', true);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware for API requests
app.use('/api', (req, res, next) => {
  console.log(`[API Request] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', apiRouter);

// Setup logic (Vite or Static)
async function startVite(serverApp: express.Application) {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    serverApp.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    serverApp.use(express.static(distPath));
    serverApp.get('*', (req, res) => {
      // Prevent API fallthrough to index.html
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API Endpoint Not Found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Global error handler for JSON requests
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]:', err);
  if (req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({ 
      error: 'Internal Server Error', 
      details: err.message || String(err),
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
  next(err);
});

// Start listener for traditional environments (AI Studio, etc.)
if (!process.env.VERCEL) {
  startVite(app).then(() => {
    const PORT = parseInt(process.env.PORT || '3000', 10);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
    });
  });
} else {
  // On Vercel, we still need to initialize things if any
  startVite(app).catch(err => console.error('[Vercel Setup Error]:', err));
}

export default app;
