import 'dotenv/config'

function required(name, fallback = '') {
  const v = process.env[name]
  if (v === undefined || v === '') return fallback
  return v
}

function mongoConnectionString() {
  const primary = required('MONGO_URI')
  if (primary) return primary
  return required('MONGODB_URI')
}

function parseOriginList(raw) {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const nodeEnv = process.env.NODE_ENV || 'development'
const jwtFromEnv = required('JWT_SECRET', '')
/** Empty in production is invalid — validated at server startup. */
const jwtSecret =
  jwtFromEnv || (nodeEnv === 'production' ? '' : 'dev-only-change-in-production')

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 4000,
  mongodbUri: mongoConnectionString(),
  jwtSecret,
  jwtExpiresIn: required('JWT_EXPIRES_IN', '7d'),
  /** Comma-separated allowed browser origins (e.g. `https://app.vercel.app,http://localhost:5173`). */
  frontendOrigins: parseOriginList(required('FRONTEND_ORIGIN', 'http://localhost:5173')),
  cloudinaryCloudName: required('CLOUDINARY_CLOUD_NAME'),
  cloudinaryApiKey: required('CLOUDINARY_API_KEY'),
  cloudinaryApiSecret: required('CLOUDINARY_API_SECRET'),
  seedPassword: required('SEED_PASSWORD', 'Survey@123'),
  /** Preferred on Render — HTTPS, no SMTP port. From Brevo → SMTP & API → API keys. */
  brevoApiKey: required('BREVO_API_KEY', ''),
  brevoFromEmail: required('BREVO_FROM_EMAIL', ''),
  brevoSmtpHost: required('BREVO_SMTP_HOST', ''),
  brevoSmtpPort: Number(required('BREVO_SMTP_PORT', '587')) || 587,
  brevoSmtpUser: required('BREVO_SMTP_USER', ''),
  brevoSmtpPass: required('BREVO_SMTP_PASS', ''),
}

export function assertCloudinaryConfigured() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    return false
  }
  return true
}
