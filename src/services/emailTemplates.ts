
export function getBaseTemplate(content: string, previewText: string = 'Update from MyParkSaathi') {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyParkSaathi</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
        .header { background: #2563eb; padding: 40px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; font-style: italic; }
        .content { padding: 40px; }
        .footer { background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
        .highlight { color: #2563eb; font-weight: 700; }
        .preview-text { display: none; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
    </style>
</head>
<body>
    <span class="preview-text">${previewText}</span>
    <div class="container">
        <div class="header">
            <h1>MyParkSaathi</h1>
        </div>
        <div class="content">
            ${content}
            <p>Best regards,<br><strong>Team MyParkSaathi</strong></p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MyParkSaathi. All rights reserved.</p>
            <p>Smart Parking Solutions for a better City.</p>
        </div>
    </div>
</body>
</html>
  `;
}

export const templates = {
  LOGIN_SUCCESS: (data: any) => ({
    subject: "Security Alert: Successful Login",
    html: getBaseTemplate(`
      <h2>Hello ${data.UserName},</h2>
      <p>A new login was detected for your account.</p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Time:</strong> ${data.Time}</p>
        <p style="margin: 0;"><strong>Device:</strong> ${data.Device}</p>
        <p style="margin: 0;"><strong>Location:</strong> ${data.Location}</p>
      </div>
      <p>If this was not you, please change your password immediately.</p>
    `, "New login detected to your account")
  }),
  
  PAYMENT_SUCCESS: (data: any) => ({
    subject: "Payment Approved: Your QR is Active!",
    html: getBaseTemplate(`
      <h2>Payment Successful!</h2>
      <p>Hi ${data.UserName}, your payment for vehicle <span class="highlight">${data.VehicleNumber}</span> has been approved.</p>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
        <p style="margin: 0; color: #166534;"><strong>Amount:</strong> ₹${data.Amount}</p>
        <p style="margin: 0; color: #166534;"><strong>Transaction ID:</strong> ${data.TxnId}</p>
      </div>
      <p>Your MyParkSaathi QR is now active and ready for use. You can access your dashboard to view your digital sticker.</p>
      <a href="https://myparksaathi.in/dashboard" class="button">Go to Dashboard</a>
    `, "Your MyParkSaathi QR is now active")
  }),

  QR_SCAN_ALERT: (data: any) => ({
    subject: "Urgent: Someone scanned your QR",
    html: getBaseTemplate(`
      <h2 style="color: #ef4444;">⚠️ QR Scan Notification</h2>
      <p>Hi ${data.UserName}, your vehicle <span class="highlight">${data.VehicleNumber}</span> has just been scanned.</p>
      <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fee2e2;">
        <p style="margin: 0;"><strong>Scanned by:</strong> ${data.ScannerName}</p>
        <p style="margin: 0;"><strong>Contact:</strong> ${data.ScannerPhone}</p>
        <p style="margin: 0;"><strong>Location:</strong> ${data.Location}</p>
        <p style="margin: 0;"><strong>Time:</strong> ${data.Time}</p>
      </div>
      <p>Please check your vehicle if you are not expecting this scan.</p>
    `, "Urgent alert: Someone scanned your vehicle QR")
  }),

  VEHICLE_EXPIRY: (data: any) => ({
    subject: "Action Required: Your subscription is expiring",
    html: getBaseTemplate(`
      <h2>Subscription Expiring</h2>
      <p>Hi ${data.UserName}, the subscription for <span class="highlight">${data.VehicleNumber}</span> will expire on <span class="highlight">${data.ExpiryDate}</span>.</p>
      <p>Renew now to keep your smart parking features active and ensure you stay reachable.</p>
      <a href="https://myparksaathi.in/renew" class="button">Renew Now</a>
    `, "Don't let your MyParkSaathi subscription expire")
  })
};
