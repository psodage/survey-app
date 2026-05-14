import { Readable } from 'stream'
import { cloudinary } from '../config/cloudinary.js'
import { assertCloudinaryConfigured } from '../config/env.js'
import SurveyFile from '../models/SurveyFile.js'
import { ApiError } from '../utils/ApiError.js'

export async function uploadBufferToCloudinary({ buffer, mimeType, folder }) {
  if (!assertCloudinaryConfigured()) {
    throw new ApiError(503, 'File uploads are not configured (set Cloudinary env vars)')
  }
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder || 'survey-app/visits',
        resource_type: 'image',
      },
      (err, result) => {
        if (err) reject(err)
        else resolve(result)
      },
    )
    Readable.from(buffer).pipe(stream)
  })
  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    bytes: uploadResult.bytes,
  }
}

export async function registerSurveyFile(req, { url, publicId, mimeType, sizeBytes, linked }) {
  const doc = await SurveyFile.create({
    companyId: req.user.companyId,
    uploadedByUserId: req.user.id,
    storageProvider: 'cloudinary',
    key: publicId,
    url,
    mimeType,
    sizeBytes,
    linked: linked || {},
  })
  return { id: doc._id.toString(), url: doc.url }
}
