export interface MetaEventData {
  eventName: string;
  userData: {
    email?: string;
    phone?: string;
    fn?: string;
    ln?: string;
    ct?: string;
    st?: string;
    zp?: string;
    country?: string;
    external_id?: string;
    client_user_agent?: string;
    client_ip_address?: string;
    fbc?: string;
    fbp?: string;
  };
  customData?: any;
  eventSourceUrl?: string;
  eventId?: string;
  testEventCode?: string;
}

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
}

export interface UploadResponse {
  url: string;
}
