export interface WhatsAppParameter {
  type: 'text' | 'currency' | 'date_time';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
}

export interface WhatsAppComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'url' | 'quick_reply';
  index?: string;
  parameters: WhatsAppParameter[];
}

export interface WhatsAppMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: WhatsAppComponent[];
  };
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
  responseRaw?: any;
}
