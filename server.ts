import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Resend } from 'resend';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import crypto from 'crypto';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cloudinary Configuration
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const upload = multer({ storage: multer.memoryStorage() });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      env: {
        cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
        resend: !!process.env.RESEND_API_KEY
      }
    });
  });

  // Cloudinary Upload Route - First to avoid body-parser issues
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    console.log('[Cloudinary] Received upload request');
    try {
      if (!req.file) {
        console.warn('[Cloudinary] No file in request');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log(`[Cloudinary] Uploading ${req.file.originalname} (${req.file.size} bytes)`);

      // Upload to Cloudinary using buffer
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      
      const response = await cloudinary.uploader.upload(dataURI, {
        folder: 'products',
        resource_type: 'auto',
      });

      console.log('[Cloudinary] Upload successful:', response.secure_url);
      res.status(200).json({ url: response.secure_url });
    } catch (error: any) {
      console.error('[Cloudinary] Upload Error:', error);
      res.status(500).json({ error: 'Failed to upload image to Cloudinary.', details: error.message });
    }
  });

  app.use(express.json());

  // Meta Conversions API Helper
  const sendMetaEvent = async (eventName: string, userData: any, customData: any = {}, eventSourceUrl: string = '', eventId?: string) => {
    const pixelId = process.env.META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;
    const testEventCode = process.env.META_TEST_EVENT_CODE;

    if (!pixelId || !accessToken) {
      console.warn('[Meta] Pixel ID or Access Token missing. Skipping event.');
      return;
    }

    const hash = (data: string) => {
      if (!data) return undefined;
      return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
    };

    const payload: any = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_id: eventId,
          event_source_url: eventSourceUrl,
          user_data: {
            em: userData.email ? [hash(userData.email)] : undefined,
            ph: userData.phone ? [hash(userData.phone)] : undefined,
            fn: userData.fn ? [hash(userData.fn)] : undefined,
            ln: userData.ln ? [hash(userData.ln)] : undefined,
            client_user_agent: userData.client_user_agent,
            client_ip_address: userData.client_ip_address,
            fbc: userData.fbc,
            fbp: userData.fbp,
          },
          custom_data: customData,
        },
      ],
      test_event_code: process.env.META_TEST_EVENT_CODE || undefined,
    };

    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v13.0/${pixelId}/events?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (result.error) {
        console.error(`[Meta] API Error for "${eventName}":`, JSON.stringify(result.error, null, 2));
      } else {
        console.log(`[Meta] Event "${eventName}" status:`, result);
      }
      return result;
    } catch (error) {
      console.error(`[Meta] Network Error sending event "${eventName}":`, error);
    }
  };

  // Meta Event Route
  app.post('/api/meta-event', async (req, res) => {
    const { eventName, userData, customData, eventSourceUrl, eventId } = req.body;
    
    // Enrich with server-side info if available
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const enrichedUserData = {
      ...userData,
      client_user_agent: req.headers['user-agent'],
      client_ip_address: Array.isArray(clientIp) ? clientIp[0] : clientIp?.split(',')[0].trim(),
    };

    const result = await sendMetaEvent(eventName, enrichedUserData, customData, eventSourceUrl, eventId);
    res.json({ success: true, result });
  });

  // API Route for sending email
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, html } = req.body;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      const msg = 'RESEND_API_KEY not found in environment variables. Please add it to your Secrets in AI Studio.';
      console.error(msg);
      return res.status(500).json({ error: msg });
    }

    const resend = new Resend(apiKey);
    // Use Resend's onboarding address for testing without a domain
    // Note: This only works if the 'to' address is your verified Resend account email
    const fromAddress = 'onboarding@resend.dev';

    try {
      console.log(`[Resend] DEBUG: From=${fromAddress}, To=${JSON.stringify(to)}, Subject=${subject}`);
      
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
      });

      if (error) {
        console.error('[Resend] API ERROR:', JSON.stringify(error, null, 2));
        
        let errorMessage = error.message;
        let tip = 'Generic Resend Error';

        if (error.name === 'validation_error') {
          tip = 'CRITICAL: The email "lizlifestylebd@gmail.com" is NOT verified in Resend. Please go to your Resend Dashboard > Settings > Senders and add/verify this email.';
        } else if (error.name === 'rate_limit_exceeded') {
          tip = 'You are sending emails too fast.';
        }

        return res.status(500).json({ 
          error: errorMessage,
          name: error.name,
          tip: tip
        });
      }

      console.log('[Resend] Success:', data);
      res.status(200).json(data);
    } catch (error) {
      console.error('[Resend] Unexpected error:', error);
      res.status(500).json({ error: 'Failed to send email due to an unexpected server error.' });
    }
  });

  // Explicitly 404 any other /api routes to prevent falling through to SPA catch-all
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found on this server` });
  });

  // Generic error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
    } else {
      next(err);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    console.log(`[Server] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
