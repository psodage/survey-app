/**
 * Test Brevo password-reset email config.
 * Usage (from backend/): node scripts/test-brevo-mail.js you@example.com
 */
import 'dotenv/config'
import {
  getBrevoConfigHint,
  getBrevoFromEmail,
  getBrevoMailMode,
  isBrevoConfigured,
  sendPasswordResetOtpEmail,
} from '../services/mailService.js'

const to = process.argv[2]?.trim()
if (!to) {
  console.error('Usage: node scripts/test-brevo-mail.js <recipient-email>')
  process.exit(1)
}

console.log('Mode:', getBrevoMailMode())
console.log('From:', getBrevoFromEmail() || '(not set)')
console.log('Configured:', isBrevoConfigured())
const hint = getBrevoConfigHint()
if (hint) console.log('Hint:', hint)

if (!isBrevoConfigured()) {
  process.exit(1)
}

const otp = '123456'
try {
  await sendPasswordResetOtpEmail({ to, otp })
  console.log('OK — test OTP email sent to', to)
} catch (err) {
  console.error('FAILED:', err.message)
  process.exit(1)
}
