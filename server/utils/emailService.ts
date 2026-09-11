// Import Nodemailer to handle SMTP connections and email dispatch
import nodemailer from "nodemailer";

/**
 * ============================================================================
 * MEMBER 1: AUTHENTICATION & SECURITY
 * Email Service (server/utils/emailService.ts)
 * ============================================================================
 * Responsibilities:
 * 1. Transporter Management: Creates and reuses a singleton Nodemailer transport
 *    when SMTP credentials are configured in environment variables.
 * 2. Responsive HTML Template: Generates a branded EcoTrack email containing
 *    the 6-digit OTP code, expiration warning, and security footer.
 * 3. Developer Experience & Fallback: In development or when SMTP is not configured,
 *    prints the OTP in an unmistakable ASCII terminal banner for zero-friction testing.
 */

// Interface defining the response returned by sendOtpEmail
interface SendOtpResult {
  success: boolean;       // True if email was delivered or logged in devMode
  previewUrl?: string;    // Optional preview URL when using test accounts
  devMode?: boolean;      // True if handled via local terminal fallback
}

// Singleton transporter instance variable
let transporter: any = null;

/**
 * getTransporter:
 * Initializes and caches the Nodemailer transporter using environment variables.
 * Returns null if SMTP variables are not fully configured.
 */
function getTransporter() {
  // If transporter was already initialized, reuse the existing instance
  if (transporter) return transporter;

  // Read SMTP settings from environment
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If all three essential settings exist, configure the transport
  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,                                                // e.g. smtp.gmail.com
      port: Number(process.env.SMTP_PORT) || 587,          // 587 for STARTTLS
      secure: process.env.SMTP_SECURE === "true",          // false for port 587
      auth: { user, pass },                               // SMTP authentication credentials
    });
    console.log("📧 Email service configured with SMTP host:", host);
  }

  // Return the configured transporter or null
  return transporter;
}

/**
 * sendOtpEmail:
 * Dispatches a password reset OTP verification code to the recipient's email.
 * - Always prints the code to the server console for immediate visibility.
 * - Sends via SMTP if configured, otherwise completes gracefully in devMode.
 */
export async function sendOtpEmail(toEmail: string, otp: string): Promise<SendOtpResult> {
  // 1. Retrieve the active Nodemailer transporter
  const mailTransporter = getTransporter();

  // 2. Read sender email address or fallback to default branded sender
  const fromAddress = process.env.SMTP_FROM || '"EcoTrack Security" <no-reply@ecotrack.local>';

  // 3. Assemble responsive HTML email template
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>EcoTrack Password Reset OTP</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e4e4e7; }
        .header { background: #09090b; padding: 28px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #10b981; }
        .body { padding: 32px 28px; text-align: center; color: #27272a; }
        .body h2 { margin-top: 0; font-size: 20px; font-weight: 600; }
        .body p { font-size: 14px; line-height: 1.6; color: #71717a; margin: 12px 0 24px; }
        .otp-box { background: #ecfdf5; border: 2px dashed #10b981; border-radius: 12px; padding: 18px 24px; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #047857; display: inline-block; margin: 8px 0 24px; user-select: all; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 9999px; margin-bottom: 24px; }
        .footer { background: #fafafa; padding: 20px 28px; text-align: center; font-size: 12px; color: #a1a1aa; border-top: 1px solid #f4f4f5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌿 EcoTrack</h1>
        </div>
        <div class="body">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your EcoTrack account password. Use the verification code below to complete the process:</p>
          <div class="otp-box">${otp}</div>
          <br>
          <div class="badge">⏱ Valid for 10 minutes</div>
          <p style="font-size: 13px; color: #a1a1aa; margin-top: 16px;">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} EcoTrack Corp. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  // 4. Prominent terminal logging: displays code in server console for local testing
  console.log("\n=======================================================");
  console.log("🔑 [ECOTRACK PASSWORD RESET OTP]");
  console.log(`   Recipient: ${toEmail}`);
  console.log(`   OTP Code:  >>> ${otp} <<<`);
  console.log("   Validity:  10 minutes");
  console.log("=======================================================\n");

  // 5. If SMTP transporter is available, attempt real email delivery
  if (mailTransporter) {
    try {
      // Send mail using Nodemailer
      const info = await mailTransporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `Your EcoTrack Verification Code: ${otp}`,
        text: `Your EcoTrack verification code is: ${otp}. It will expire in 10 minutes.`,
        html: htmlContent,
      });

      console.log(`✅ Reset OTP email dispatched to ${toEmail} (MessageId: ${info.messageId})`);
      return { success: true };
    } catch (err) {
      // If SMTP fails, log the error and complete gracefully via console fallback
      console.error("⚠️ Failed to dispatch email via SMTP, falling back to local terminal code:", err);
      return { success: true, devMode: true };
    }
  }

  // 6. Development mode without SMTP credentials
  return { success: true, devMode: true };
}
