import { v2 as cloudinary } from 'cloudinary'
import { assertCloudinaryConfigured, env } from './env.js'

export function configureCloudinary() {
  if (!assertCloudinaryConfigured()) return false
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  })
  return true
}

export { cloudinary }
