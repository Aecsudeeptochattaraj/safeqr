# MyParkSaathi Email System Setup (100% Free)

This guide provides a step-by-step setup for a professional, transactional email system using **Firebase** and **Gmail SMTP** (the truly free path).

## 1. Architecture Overview
- **Frontend (React/Vite)**: Triggers email events via `EmailService.send()`.
- **Backend (Express API)**: Processes requests and uses `Nodemailer`.
- **SMTP Provider (Gmail)**: Sends the actual emails.
- **Security**: No hardcoded passwords. Credentials reside in Environment Variables.

## 2. Setup Steps (Gmail App Password)
Gmail does not allow logging in with your normal password via apps. You must use an **App Password**.

1.  Go to your [Google Account](https://myaccount.google.com/).
2.  Enable **2nd Step Verification** if not already enabled.
3.  Search for "App Passwords" in the search bar.
4.  Create a new app called `MyParkSaathi`.
5.  Copy the **16-character password** provided.

## 3. Configuration
Add these to your **Secrets** panel in AI Studio or your `.env` file:

```env
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

## 4. Usage in Code

### Sending a Login Success Email
```ts
import { EmailService, EmailEventType } from './services/emailService';

await EmailService.send(EmailEventType.LOGIN_SUCCESS, {
  UserName: 'John Doe',
  Email: 'recipient@example.com',
  Time: new Date().toLocaleString(),
  Device: navigator.userAgent,
  Location: 'New Delhi, India'
});
```

### Sending a Payment Success Email
```ts
await EmailService.send(EmailEventType.PAYMENT_SUCCESS, {
  UserName: 'John Doe',
  Email: 'recipient@example.com',
  Amount: '499',
  VehicleNumber: 'DL 3C AB 1234',
  TxnId: 'TXN88922'
});
```

## 5. Free Upgrade Path (Scalability)
If you exceed 500 emails per day (Gmail limit):
1.  **Resend (Free tier)**: 3,000 emails/month free.
2.  **ZeptoMail**: Very low cost per 10k emails.
3.  **Mailtrap**: Good for testing.

## 6. Best Practices
- **Rate Limiting**: Our backend has a built-in rate limiter for API routes.
- **HTML Templates**: Use the `emailTemplates.ts` to maintain a consistent brand identity.
- **Fail Gracefully**: If the API call fails, the app continues to work but logs the error.
