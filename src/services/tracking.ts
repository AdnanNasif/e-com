export const TrackingService = {
  trackMetaEvent: async (eventName: string, userData: any, customData: any = {}) => {
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
      };

      const payload = {
        eventName,
        userData: {
          ...userData,
          fbc: getCookie('_fbc'),
          fbp: getCookie('_fbp'),
        },
        customData,
        eventSourceUrl: window.location.href,
      };

      const response = await fetch('/api/meta-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.warn(`Meta CAPI Proxy failed (${response.status}):`, text.substring(0, 100));
      }
    } catch (err) {
      console.warn('Meta tracking failed:', err);
    }
  }
};
