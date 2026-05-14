import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let transporter = null

export function isBrevoConfigured() {
  return Boolean(env.brevoSmtpHost && env.brevoSmtpUser && env.brevoSmtpPass && env.brevoFromEmail)
}

function getTransporter() {
  if (!isBrevoConfigured()) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.brevoSmtpHost,
      port: env.brevoSmtpPort,
      secure: env.brevoSmtpPort === 465,
      auth: {
        user: env.brevoSmtpUser,
        pass: env.brevoSmtpPass,
      },
    })
  }
  return transporter
}

function buildOtpEmailHtml(otp) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0a0c10;color:#e8eaed;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0c10;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#12161d;border:1px solid #2a3038;border-radius:14px;padding:28px 24px;">
          <tr><td style="font-size:18px;font-weight:700;color:#f39b03;">Samarth SurveyOS</td></tr>
          <tr><td style="padding-top:18px;font-size:15px;line-height:1.55;color:#c4c9d1;">
            Use the one-time password below to reset your account password. This code is valid for <strong>10 minutes</strong>.
          </td></tr>
          <tr>
            <td align="center" style="padding:26px 0;">
              <div style="display:inline-block;letter-spacing:0.35em;font-size:28px;font-weight:800;color:#ffffff;background:#1a1f28;border:1px solid #f39b03;border-radius:12px;padding:16px 22px;">
                ${otp}
              </div>
            </td>
          </tr>
          <tr><td style="font-size:14px;line-height:1.5;color:#9aa3af;border-top:1px solid #2a3038;padding-top:18px;">
            <strong style="color:#f39b03;">Do not share this OTP with anyone.</strong> Samarth SurveyOS staff will never ask you for this code.
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * @param {{ to: string, otp: string }} params
 */
export async function sendPasswordResetOtpEmail({ to, otp }) {
  const transport = getTransporter()
  if (!transport) {
    throw new Error('Brevo SMTP is not configured')
  }
  await transport.sendMail({
    from: `"Samarth SurveyOS" <${env.brevoFromEmail}>`,
    to,
    subject: 'Password Reset OTP - Samarth SurveyOS',
    text: `Your password reset OTP is ${otp}. It is valid for 10 minutes. Do not share this OTP with anyone.`,
    html: buildOtpEmailHtml(otp),
  })
}
