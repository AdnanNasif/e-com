import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Resend } from 'resend';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
