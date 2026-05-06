import { templates } from './emailTemplates';

export enum EmailEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  QR_SCAN_ALERT = 'QR_SCAN_ALERT',
  VEHICLE_EXPIRY = 'VEHICLE_EXPIRY',
}

interface EmailData {
  UserName: string;
  Email: string;
  Location?: string;
  Time?: string;
  Device?: string;
  TxnId?: string;
  Amount?: string;
  VehicleNumber?: string;
  ExpiryDate?: string;
}

export class EmailService {
  /**
   * Sends a transactional email via the MyParkSaathi Backend.
   * This uses the standard fetch API and requires the backend to be running.
   */
  static async send(type: EmailEventType, data: EmailData): Promise<{ success: boolean; message?: string }> {
    try {
      let template;
      switch (type) {
        case EmailEventType.LOGIN_SUCCESS:
          template = templates.LOGIN_SUCCESS(data);
          break;
        case EmailEventType.PAYMENT_SUCCESS:
          template = templates.PAYMENT_SUCCESS(data);
          break;
        case EmailEventType.QR_SCAN_ALERT:
          template = templates.QR_SCAN_ALERT(data);
          break;
        case EmailEventType.VEHICLE_EXPIRY:
          template = templates.VEHICLE_EXPIRY(data);
          break;
        default:
          throw new Error('Unknown email event type');
      }

      console.log(`[MAIL-CLIENT] Sending ${type} to ${data.Email}...`);

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: data.Email,
          subject: template.subject,
          html: template.html,
          previewText: template.subject
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to send email');
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('[MAIL-CLIENT-ERROR]', error);
      return { success: false, message: error.message };
    }
  }
}
