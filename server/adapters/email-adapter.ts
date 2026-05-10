import { Resend } from 'resend';
import { EmailData } from '../core/types';

export class EmailAdapter {
  private resend: Resend | null = null;
  private fromAddress = 'onboarding@resend.dev';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendEmail(data: EmailData) {
    if (!this.resend) {
      throw new Error('RESEND_API_KEY not configured.');
    }

    const { data: result, error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: Array.isArray(data.to) ? data.to : [data.to],
      subject: data.subject,
      html: data.html,
    });

    if (error) {
      console.error('[EmailAdapter] Error:', error);
      throw error;
    }

    return result;
  }
}
