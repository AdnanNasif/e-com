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

      await fetch('/api/meta-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Meta tracking failed:', err);
    }
  }
};
