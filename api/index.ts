import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import crypto from 'crypto';
import { Resend } from 'resend';

// Vercel handles the environment variables, so we just use process.env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: 'vercel',
    meta: {
      pixel_id: !!process.env.META_PIXEL_ID,
      token: !!process.env.META_ACCESS_TOKEN ? 'LOADED' : 'MISSING',
      test_code: !!process.env.META_TEST_EVENT_CODE
    },
    resend: !!process.env.RESEND_API_KEY
  });
});

// Use JSON body parser for everything except upload
app.use((req, res, next) => {
  if (req.path === '/api/upload') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Meta Event Helper
const sendMetaEvent = async (eventName: string, userData: any, customData: any = {}, eventSourceUrl: string = '', eventId?: string) => {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!pixelId || !accessToken) return { error: 'Missing Meta credentials' };

  const hash = (data: string) => {
    if (!data) return undefined;
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
  };

  const payload: any = {
    data: [{
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
    }],
  };

  if (testEventCode) payload.test_event_code = testEventCode;

  try {
    const response = await fetch(`https://graph.facebook.com/v13.0/${pixelId}/events?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error: any) {
    return { error: error.message };
  }
};

// Routes
app.post('/api/meta-event', async (req, res) => {
  const { eventName, userData, customData, eventSourceUrl, eventId } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const enrichedUserData = {
    ...userData,
    client_user_agent: req.headers['user-agent'],
    client_ip_address: Array.isArray(clientIp) ? clientIp[0] : clientIp?.split(',')[0].trim(),
  };

  const result = await sendMetaEvent(eventName, enrichedUserData, customData, eventSourceUrl, eventId);
  res.json({ success: true, result, debug: { enrichedUserData, eventId } });
});

app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not found' });

  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    if (error) {
      console.error('[Email Error] Resend API error:', error);
      return res.status(500).json({ error: error.message, details: error });
    }
    res.json(data);
  } catch (error: any) {
    console.error('[Email Error] Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    const response = await cloudinary.uploader.upload(dataURI, {
      folder: 'products',
      resource_type: 'auto',
    });
    res.status(200).json({ url: response.secure_url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
