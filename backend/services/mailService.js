import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'
const API_TIMEOUT_MS = 12_000
/** Fail fast on SMTP (Render often blocks or stalls port 587). */
const SMTP_TIMEOUT_MS = 10_000

let transporter = null

export function isBrevoApiConfigured() {
  return Boolean(env.brevoApiKey?.trim() && env.brevoFromEmail?.trim())
}

export function isBrevoSmtpConfigured() {
  return Boolean(
    env.brevoSmtpHost?.trim() &&
      env.brevoSmtpUser?.trim() &&
      env.brevoSmtpPass?.trim() &&
      env.brevoFromEmail?.trim(),
  )
}

export function isBrevoConfigured() {
  return isBrevoApiConfigured() || isBrevoSmtpConfigured()
}

/** @returns {'api' | 'smtp' | 'none'} */
export function getBrevoMailMode() {
  if (isBrevoApiConfigured()) return 'api'
  if (isBrevoSmtpConfigured()) return 'smtp'
  return 'none'
}

function getTransporter() {
  if (!isBrevoSmtpConfigured()) return null
  if (!transporter) {
    const port = env.brevoSmtpPort
    const useSsl = port === 465
    transporter = nodemailer.createTransport({
      host: env.brevoSmtpHost.trim(),
      port,
      secure: useSsl,
      requireTLS: !useSsl,
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
      auth: {
        user: env.brevoSmtpUser.trim(),
        pass: env.brevoSmtpPass.trim(),
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

function otpEmailText(otp) {
  return `Your password reset OTP is ${otp}. It is valid for 10 minutes. Do not share this OTP with anyone.`
}

async function sendPasswordResetOtpEmailViaApi({ to, otp }) {
  const fromEmail = env.brevoFromEmail.trim()
  const htmlContent = buildOtpEmailHtml(otp)
  const textContent = otpEmailText(otp)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': env.brevoApiKey.trim(),
      },
      body: JSON.stringify({
        sender: { name: 'Samarth SurveyOS', email: fromEmail },
        to: [{ email: to }],
        subject: 'Password Reset OTP - Samarth SurveyOS',
        htmlContent,
        textContent,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      let detail = ''
      try {
        const body = await res.json()
        detail = body?.message || body?.error || JSON.stringify(body)
      } catch {
        detail = await res.text().catch(() => '')
      }
      throw new Error(`Brevo API ${res.status}${detail ? `: ${detail}` : ''}`)
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Brevo API request timed out')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function sendPasswordResetOtpEmailViaSmtp({ to, otp }) {
  const transport = getTransporter()
  if (!transport) {
    throw new Error('Brevo SMTP is not configured')
  }
  await transport.sendMail({
    from: `"Samarth SurveyOS" <${env.brevoFromEmail.trim()}>`,
    to,
    subject: 'Password Reset OTP - Samarth SurveyOS',
    text: otpEmailText(otp),
    html: buildOtpEmailHtml(otp),
  })
}

/**
 * @param {{ to: string, otp: string }} params
 */
export async function sendPasswordResetOtpEmail({ to, otp }) {
  if (isBrevoApiConfigured()) {
    return sendPasswordResetOtpEmailViaApi({ to, otp })
  }
  return sendPasswordResetOtpEmailViaSmtp({ to, otp })
}
