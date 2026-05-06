
export function getBaseTemplate(content: string, previewText: string = 'Update from MyParkSaathi') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyParkSaathi</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            color: #1e293b; 
            margin: 0; 
            padding: 0; 
            background-color: #f1f5f9; 
        }
        .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: #ffffff; 
            border-radius: 24px; 
            overflow: hidden; 
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1); 
            border: 1px solid #e2e8f0; 
        }
        .header { 
            background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); 
            padding: 40px 20px; 
            text-align: center; 
        }
        .header h1 { 
            color: #ffffff; 
            margin: 0; 
            font-size: 28px; 
            font-weight: 800; 
            text-transform: uppercase; 
            letter-spacing: -0.02em; 
        }
        .header p {
            color: rgba(255, 255, 255, 0.8);
            margin: 8px 0 0 0;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .content { 
            padding: 40px; 
        }
        .card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
        }
        .footer { 
            background: #ffffff; 
            padding: 32px 20px; 
            text-align: center; 
            color: #64748b; 
            font-size: 12px;
            border-top: 1px solid #f1f5f9;
        }
        .button { 
            display: inline-block; 
            padding: 16px 32px; 
            background: #2563eb; 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 12px; 
            font-weight: 800; 
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 8px;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
        }
        .highlight { 
            color: #1d4ed8; 
            font-weight: 700; 
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            background: #dbeafe;
            color: #1e40af;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 16px;
        }
        .footer-links {
            margin-top: 16px;
        }
        .footer-links a {
            color: #64748b;
            text-decoration: none;
            margin: 0 8px;
        }
        .preview-text { 
            display: none; 
            visibility: hidden; 
            opacity: 0; 
            color: transparent; 
            height: 0; 
            width: 0; 
        }
        h2 {
            margin-top: 0;
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .info-label {
            color: #64748b;
            font-weight: 600;
        }
        .info-value {
            color: #0f172a;
            font-weight: 700;
        }
    </style>
</head>
<body>
    <span class="preview-text">${previewText}</span>
    <div class="container">
        <div class="header">
            <h1>ParkSaathi</h1>
            <p>Smart & Secure Mobility</p>
        </div>
        <div class="content">
            ${content}
            <div style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 24px;">
                <p style="margin: 0; font-weight: 700; color: #0f172a;">Team MyParkSaathi</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Ensuring your peace of mind, every time you park.</p>
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MyParkSaathi. All rights reserved.</p>
            <div class="footer-links">
                <a href="https://myparksaathi.in/support">Support</a> &bull;
                <a href="https://myparksaathi.in/privacy">Privacy</a> &bull;
                <a href="https://myparksaathi.in/dashboard">Dashboard</a>
            </div>
        </div>
    </div>
</body>
</html>
  `;
}

export const templates = {
  LOGIN_SUCCESS: (data: any) => ({
    subject: "🔐 Security Alert: Successful Login",
    html: getBaseTemplate(`
      <div class="badge">Security Log</div>
      <h2>Secure Login Detected</h2>
      <p>Hello <span class="highlight">${data.UserName}</span>, a new login was detected for your MyParkSaathi account.</p>
      
      <div class="card">
        <p style="margin: 0 0 12px 0; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;"><strong>SESSION DETAILS</strong></p>
        <p style="margin: 8px 0;"><strong>Timestamp:</strong> ${data.Time || new Date().toLocaleString()}</p>
        <p style="margin: 8px 0;"><strong>Device info:</strong> ${data.Device || 'Unknown Browser'}</p>
        <p style="margin: 8px 0;"><strong>IP Location:</strong> ${data.Location || 'Direct Access'}</p>
      </div>

      <p style="font-size: 14px; color: #64748b;">If this wasn't you, your account may be at risk. Contact our security team immediately or reset your password.</p>
      
      <div style="text-align: center;">
        <a href="https://myparksaathi.in/login" class="button">Go to Dashboard</a>
      </div>
    `, `New login to your MyParkSaathi account detected from ${data.Location || 'a new device'}`)
  }),

  LOGOUT_ALERT: (data: any) => ({
    subject: "🚪 Session Ended: Account Logged Out",
    html: getBaseTemplate(`
      <div class="badge">Session Update</div>
      <h2>Account Logged Out</h2>
      <p>A session has been terminated for <span class="highlight">${data.UserName}</span>.</p>
      
      <div class="card">
        <p style="margin: 8px 0;"><strong>Time:</strong> ${data.Time || new Date().toLocaleString()}</p>
        <p style="margin: 8px 0;"><strong>Status:</strong> Successfully Terminated</p>
      </div>

      <p>We've successfully closed your active session to ensure your data remains private. If you intended to stay logged in, simply sign back in.</p>
      
      <div style="text-align: center;">
        <a href="https://myparksaathi.in/login" class="button">Log In Again</a>
      </div>
    `, "Your MyParkSaathi session has ended")
  }),

  PROFILE_UPDATE: (data: any) => ({
    subject: "✏️ Account Update: Profile Modified",
    html: getBaseTemplate(`
      <div class="badge">Profile Sync</div>
      <h2>Your Profile Has Been Updated</h2>
      <p>Hello <span class="highlight">${data.UserName}</span>, we're letting you know that changes were recently made to your account profile.</p>
      
      <div class="card">
        <p style="margin: 8px 0;"><strong>Modified at:</strong> ${data.Time || new Date().toLocaleString()}</p>
        <p style="margin: 8px 0;"><strong>Action:</strong> Web Profile Update</p>
      </div>

      <p>If you did not make these changes, please review your account settings immediately to verify your information.</p>
      
      <div style="text-align: center;">
        <a href="https://myparksaathi.in/dashboard" class="button">Review Profile</a>
      </div>
    `, "We've updated your account profile information")
  }),

  SUSPICIOUS_LOGIN: (data: any) => ({
    subject: "⚠️ URGENT: Suspicious Login Attempt Blocked",
    html: getBaseTemplate(`
      <div class="badge" style="background: #fee2e2; color: #991b1b;">High Priority</div>
      <h2 style="color: #991b1b;">Unusual Activity Detected</h2>
      <p>Hello <span class="highlight">${data.UserName}</span>, our security engine detected an unusual login pattern on your account.</p>
      
      <div class="card" style="border-color: #fecaca; background: #fff1f2;">
        <p style="margin: 8px 0; color: #991b1b;"><strong>Target Location:</strong> ${data.Location || 'Unknown'}</p>
        <p style="margin: 8px 0; color: #991b1b;"><strong>Device signature:</strong> ${data.Device || 'Mismatched User Agent'}</p>
        <p style="margin: 8px 0; color: #991b1b;"><strong>Timestamp:</strong> ${data.Time || new Date().toLocaleString()}</p>
      </div>

      <p>To protect your account, we recommend a mandatory password reset and review of your verified vehicles.</p>
      
      <div style="text-align: center;">
        <a href="https://myparksaathi.in/reset-password" class="button" style="background: #dc2626;">Secure My Account</a>
      </div>
    `, "Urgent: Suspicious login attempt to your account detected")
  }),
  
  PAYMENT_SUCCESS: (data: any) => ({
    subject: "⚡ Quick Start: Your Payment is Verified!",
    html: getBaseTemplate(`
      <div class="badge" style="background: #f0fdf4; color: #166534;">Payment Approved</div>
      <h2>Payment Received Successfully!</h2>
      <p>Hi ${data.UserName}, your payment for vehicle <span class="highlight">${data.VehicleNumber}</span> has been confirmed. Your smart features are now active.</p>
      
      <div class="card" style="background: #f0fdf4; border: 1px solid #bbf7d0;">
        <p style="margin: 8px 0; color: #166534;"><strong>Amount Paid:</strong> ₹${data.Amount}</p>
        <p style="margin: 8px 0; color: #166534;"><strong>Transaction ID:</strong> ${data.TxnId}</p>
        <p style="margin: 8px 0; color: #166534;"><strong>Active Since:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <p>Your MyParkSaathi QR is now active. Stick it clearly on your vehicle to ensure others can reach you securely without exposing your phone number.</p>
      
      <div style="text-align: center;">
        <a href="https://myparksaathi.in/dashboard" class="button">Get My QR Sticker</a>
      </div>
    `, "Success! Your MyParkSaathi QR is now active and ready for use")
  }),

  QR_SCAN_ALERT: (data: any) => ({
    subject: "🚨 Vehicle Alert: Someone is reaching out!",
    html: getBaseTemplate(`
      <div class="badge" style="background: #fff7ed; color: #9a3412;">Real-time Alert</div>
      <h2 style="color: #c2410c;">Vehicle QR Scanned</h2>
      <p>Hi ${data.UserName}, someone just scanned the QR code on your vehicle <span class="highlight">${data.VehicleNumber}</span>.</p>
      
      <div class="card" style="background: #fffcf0; border: 1px solid #fde68a;">
        <p style="margin: 8px 0;"><strong>Location:</strong> ${data.Location || 'Not provided'}</p>
        <p style="margin: 8px 0;"><strong>Time:</strong> ${data.Time || new Date().toLocaleString()}</p>
        <p style="margin: 8px 0;"><strong>Communication:</strong> Secure Relay Enabled</p>
      </div>

      <p style="font-weight: 700;">Please check your notification center in the app to view the message from the scanner.</p>
      
      <div style="text-align: center;">
        <a href="https://myparksaathi.in/dashboard" class="button" style="background: #ea580c;">View Notifications</a>
      </div>
    `, `Action Required: Someone scanned your vehicle QR at ${data.Time}`)
  }),

  VEHICLE_EXPIRY: (data: any) => ({
    subject: "⏰ Renewal Notice: Subscription Expiring Soon",
    html: getBaseTemplate(`
      <div class="badge" style="background: #fef2f2; color: #991b1b;">Expiring Soon</div>
      <h2>Action Required: Expiry Impending</h2>
      <p>Hi ${data.UserName}, the smart protection for <span class="highlight">${data.VehicleNumber}</span> is set to expire on <span class="highlight">${data.ExpiryDate}</span>.</p>
      
      <p>To avoid any disruption in receiving emergency parking alerts, please renew your subscription today. It only takes 60 seconds.</p>
      
      <div style="text-align: center;">
        <a href="https://myparksaathi.in/dashboard" class="button">Renew Now</a>
      </div>
    `, `Your MyParkSaathi protection for ${data.VehicleNumber} expires on ${data.ExpiryDate}`)
  })
};
