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
    meta: {
      pixel_id: !!(process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID),
      token: !!(process.env.META_ACCESS_TOKEN || process.env.VITE_META_ACCESS_TOKEN) ? 'LOADED' : 'MISSING',
      test_code: !!(process.env.META_TEST_EVENT_CODE || process.env.VITE_META_TEST_EVENT_CODE)
    },
    cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
    resend: !!process.env.RESEND_API_KEY
  });
});

// Upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await cloudinary.upload(req.file);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Meta Events
router.post('/meta-event', async (req, res) => {
  try {
    const { eventName, userData, customData, eventSourceUrl, eventId, testEventCode } = req.body;
    const enrichedUserData = {
      ...userData,
      client_user_agent: req.headers['user-agent'],
      client_ip_address: req.ip,
    };
    const result = await meta.sendEvent({ 
      eventName, 
      userData: enrichedUserData, 
      customData, 
      eventSourceUrl,
      eventId,
      testEventCode 
    });
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: 'Meta event failed', details: error.message });
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
