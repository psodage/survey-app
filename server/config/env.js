import 'dotenv/config'

function required(name, fallback = '') {
  const v = process.env[name]
  if (v === undefined || v === '') return fallback
  return v
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  mongodbUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET', 'dev-only-change-in-production'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '7d'),
  frontendOrigin: required('FRONTEND_ORIGIN', 'http://localhost:5173'),
  cloudinaryCloudName: required('CLOUDINARY_CLOUD_NAME'),
  cloudinaryApiKey: required('CLOUDINARY_API_KEY'),
  cloudinaryApiSecret: required('CLOUDINARY_API_SECRET'),
  seedPassword: required('SEED_PASSWORD', 'Survey@123'),
}

export function assertCloudinaryConfigured() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    return false
  }
  return true
}
