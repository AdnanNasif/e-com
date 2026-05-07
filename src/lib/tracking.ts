/**
 * Meta Pixel & Conversion API (CAPI) Tracking Utility
 */

interface TrackEventParams {
  eventName: string;
  userData?: {
    em?: string; // Email (hashed)
    ph?: string; // Phone (hashed)
    fn?: string; // First Name
    ln?: string; // Last Name
  };
  customData?: Record<string, any>;
  eventId?: string;
}

/**
 * Utility to hash strings for Meta PII requirements (SHA-256)
 * Note: For production, use a more robust hashing method if possible.
 */
async function hashString(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const trackEvent = async ({ eventName, userData, customData, eventId }: TrackEventParams) => {
  // 1. Browser-side tracking (Pixel)
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, customData, { eventID: eventId });
  }

  // 2. Server-side tracking (CAPI Proxy)
  try {
    const hashedUserData = userData ? {
      em: userData.em ? await hashString(userData.em) : undefined,
      ph: userData.ph ? await hashString(userData.ph) : undefined,
      fn: userData.fn ? await hashString(userData.fn) : undefined,
      ln: userData.ln ? await hashString(userData.ln) : undefined,
    } : {};

    await fetch('/api/fb-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_data: hashedUserData,
        custom_data: customData,
        event_source_url: window.location.href,
      }),
    });
  } catch (error) {
    console.warn('[Tracking] CAPI track failed:', error);
  }
};
