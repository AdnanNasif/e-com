import express from 'express';
import multer from 'multer';
import { CloudinaryAdapter } from '../adapters/cloudinary-adapter';
import { MetaAdapter } from '../adapters/meta-adapter';
import { EmailAdapter } from '../adapters/email-adapter';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const cloudinary = new CloudinaryAdapter();
const meta = new MetaAdapter();
const email = new EmailAdapter();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    meta: {
      pixel_id: !!(process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID),
      token: !!(process.env.META_ACCESS_TOKEN || process.env.VITE_META_ACCESS_TOKEN) ? 'LOADED' : 'MISSING',
      test_code: !!(process.env.META_TEST_EVENT_CODE || process.env.VITE_META_TEST_EVENT_CODE)
    },
    cloudinary: {
      cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
      api_key: !!process.env.CLOUDINARY_API_KEY,
      api_secret: !!process.env.CLOUDINARY_API_SECRET
    },
    resend: !!process.env.RESEND_API_KEY
  });
});

// Upload
router.get('/upload', (req, res) => {
  res.json({ message: 'Upload endpoint is active. Use POST to upload files.' });
});

router.post('/upload', upload.single('file'), async (req, res) => {
  console.log('[API] Received upload request');
  try {
    if (!req.file) {
      console.log('[API] No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('[API] File received:', req.file.originalname, req.file.mimetype, req.file.size);
    const result = await cloudinary.upload(req.file);
    console.log('[API] Upload successful');
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[API] Upload failed:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Meta Events
router.post('/meta-event', async (req, res) => {
  console.log('[API] Received meta-event request:', req.body.eventName);
  try {
    const { eventName, userData, customData, eventSourceUrl, eventId, testEventCode } = req.body;
    
    if (!eventName) {
      console.warn('[API] Missing eventName in request body');
      return res.status(400).json({ error: 'Missing eventName' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const enrichedUserData = {
      ...(userData || {}),
      client_user_agent: req.headers['user-agent'],
      client_ip_address: typeof clientIp === 'string' ? clientIp : (Array.isArray(clientIp) ? clientIp[0] : String(clientIp || '')),
    };

    console.log('[API] Processing event:', eventName, { eventId, hasPixel: !!(process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID) });
    
    const result: any = await meta.sendEvent({ 
      eventName, 
      userData: enrichedUserData, 
      customData, 
      eventSourceUrl,
      eventId,
      testEventCode 
    });

    if (result && result.success === false) {
      console.error('[API] Meta CAPI reported failure:', result.error);
      // Return 200 but success: false if it's a known error from Meta or if configuration is missing
      // This prevents the proxy itself from being a "failure" source if the integration is just disabled
      return res.json({ success: false, error: result.error, details: result.details });
    }

    console.log('[API] Meta event process completed successfully');
    res.json({ success: true, result: result.result });
  } catch (error: any) {
    console.error('[API] Meta event exception:', error);
    res.status(500).json({ 
      error: 'Meta event exception', 
      details: error?.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

// Email
router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    const result = await email.sendEmail({ to, subject, html });
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Email failed', details: error.message });
  }
});

export default router;
