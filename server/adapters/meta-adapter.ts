import crypto from 'crypto';
import { MetaEventData } from '../core/types';

export class MetaAdapter {
  private pixelId = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID;
  private accessToken = process.env.META_ACCESS_TOKEN || process.env.VITE_META_ACCESS_TOKEN;
  private testEventCode = process.env.META_TEST_EVENT_CODE || process.env.VITE_META_TEST_EVENT_CODE;

  private hash(data: any) {
    if (!data || typeof data !== 'string') return undefined;
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
  }

  async sendEvent(data: MetaEventData) {
    if (!this.pixelId || !this.accessToken) {
      const msg = '[Meta] Pixel ID or Access Token missing. Ensure META_PIXEL_ID and META_ACCESS_TOKEN are set.';
      console.warn(msg);
      return { success: false, error: msg };
    }

    const testEventCode = data.testEventCode || this.testEventCode;
    const userData = data.userData || {};

    const payload: any = {
      data: [
        {
          event_name: data.eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_id: data.eventId,
          event_source_url: data.eventSourceUrl,
          user_data: {
            em: userData.email ? [this.hash(userData.email)] : undefined,
            ph: userData.phone ? [this.hash(userData.phone)] : undefined,
            fn: userData.fn ? [this.hash(userData.fn)] : undefined,
            ln: userData.ln ? [this.hash(userData.ln)] : undefined,
            ct: userData.ct ? [this.hash(userData.ct)] : undefined,
            st: userData.st ? [this.hash(userData.st)] : undefined,
            zp: userData.zp ? [this.hash(userData.zp)] : undefined,
            country: userData.country ? [this.hash(userData.country)] : undefined,
            external_id: userData.external_id || undefined,
            client_user_agent: userData.client_user_agent,
            client_ip_address: userData.client_ip_address,
            fbc: userData.fbc,
            fbp: userData.fbp,
          },
          custom_data: data.customData,
        },
      ],
    };

    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    try {
      const url = `https://graph.facebook.com/v13.0/${this.pixelId}/events?access_token=${this.accessToken}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log(`[Meta] Response status: ${response.status}`);
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error(`[Meta] Non-JSON response: ${responseText.substring(0, 500)}`);
        throw new Error(`Invalid JSON response from Meta: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok || result.error) {
        console.error(`[Meta] API Error Payload:`, JSON.stringify(result.error || result, null, 2));
        return { success: false, error: result.error || result };
      }

      return { success: true, result };
    } catch (error) {
      console.error(`[Meta] Error sending event "${data.eventName}":`, error);
      throw error;
    }
  }
}
