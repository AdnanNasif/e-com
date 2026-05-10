import crypto from 'crypto';
import { MetaEventData } from '../core/types';

export class MetaAdapter {
  private pixelId = process.env.META_PIXEL_ID;
  private accessToken = process.env.META_ACCESS_TOKEN;
  private testEventCode = process.env.META_TEST_EVENT_CODE;

  private hash(data: string) {
    if (!data) return undefined;
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
  }

  async sendEvent(data: MetaEventData) {
    if (!this.pixelId || !this.accessToken) {
      console.warn('[Meta] Pixel ID or Access Token missing. Skipping event.');
      return;
    }

    const testEventCode = data.testEventCode || this.testEventCode;

    const payload: any = {
      data: [
        {
          event_name: data.eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_id: data.eventId,
          event_source_url: data.eventSourceUrl,
          user_data: {
            em: data.userData.email ? [this.hash(data.userData.email)] : undefined,
            ph: data.userData.phone ? [this.hash(data.userData.phone)] : undefined,
            fn: data.userData.fn ? [this.hash(data.userData.fn)] : undefined,
            ln: data.userData.ln ? [this.hash(data.userData.ln)] : undefined,
            client_user_agent: data.userData.client_user_agent,
            client_ip_address: data.userData.client_ip_address,
            fbc: data.userData.fbc,
            fbp: data.userData.fbp,
          },
          custom_data: data.customData,
        },
      ],
    };

    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v13.0/${this.pixelId}/events?access_token=${this.accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.error) {
        console.error(`[Meta] API Error:`, result.error);
      }
      return result;
    } catch (error) {
      console.error(`[Meta] Error sending event "${data.eventName}":`, error);
      throw error;
    }
  }
}
