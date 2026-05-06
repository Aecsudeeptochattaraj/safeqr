/**
 * System-wide configuration for contact and administrative details.
 * All these should ideally be populated from environment variables
 * or a secure remote configuration service.
 */

export const SYSTEM_CONFIG = {
  SUPPORT_EMAIL: 'support@myparksaathi.in',
  SUPPORT_WHATSAPP: '910000000000', // Update with actual support number
  UPI_ID: 'payment@okicici', // Generic placeholder
  SUPER_ADMIN_EMAIL: import.meta.env.VITE_SUPER_ADMIN_EMAIL,
  APP_NAME: 'MyParkSaathi',
  REPLY_TO_EMAIL: 'notifications@myparksaathi.in',
};
