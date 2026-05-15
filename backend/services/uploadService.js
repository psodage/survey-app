import mongoose from 'mongoose'
import { Readable } from 'stream'
import { cloudinary } from '../config/cloudinary.js'
import { assertCloudinaryConfigured } from '../config/env.js'
import SurveyFile from '../models/SurveyFile.js'
import { ApiError } from '../utils/ApiError.js'

const CLOUDINARY_DELETE_CHUNK = 100

/** Parse Cloudinary delivery URL → `public_id` (folder/name, no extension). */
export function publicIdFromCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const parsed = new URL(url.trim())
    if (!parsed.hostname.includes('res.cloudinary.com')) return null
    const segments = parsed.pathname.split('/').filter(Boolean)
    const uploadIdx = segments.indexOf('upload')
    if (uploadIdx === -1) return null
    let after = segments.slice(uploadIdx + 1)
    if (after[0] && /^v\d+$/.test(after[0])) after = after.slice(1)
    if (!after.length) return null
    const lastIdx = after.length - 1
    after[lastIdx] = after[lastIdx].replace(/\.[a-zA-Z0-9]+$/, '')
    return after.join('/')
  } catch {
    return null
  }
}

function resourceTypeForMime(mimeType) {
  if (!mimeType) return 'image'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'raw'
  if (mimeType.startsWith('video/')) return 'video'
  return 'image'
}

/**
 * Delete assets from Cloudinary. Best-effort: logs failures, does not throw.
 * @param {{ publicId: string, mimeType?: string }[]} assets
 */
export async function deleteCloudinaryAssets(assets) {
  if (!assets?.length) return { deleted: 0, skipped: true }
  if (!assertCloudinaryConfigured()) return { deleted: 0, skipped: true }

  const byType = new Map()
  for (const asset of assets) {
    const publicId = (asset.publicId ?? asset.key ?? '').trim()
    if (!publicId) continue
    const resourceType = resourceTypeForMime(asset.mimeType)
    if (!byType.has(resourceType)) byType.set(resourceType, new Set())
    byType.get(resourceType).add(publicId)
  }

  let deleted = 0
  for (const [resourceType, idSet] of byType) {
    const ids = [...idSet]
    for (let i = 0; i < ids.length; i += CLOUDINARY_DELETE_CHUNK) {
      const chunk = ids.slice(i, i + CLOUDINARY_DELETE_CHUNK)
      try {
        const res = await cloudinary.api.delete_resources(chunk, { resource_type: resourceType })
        const statuses = res?.deleted ?? {}
        deleted += Object.values(statuses).filter((s) => s === 'deleted' || s === 'not_found').length
      } catch (err) {
        console.error('[cloudinary] delete_resources failed:', resourceType, err?.message || err)
        for (const publicId of chunk) {
          try {
            const one = await cloudinary.uploader.destroy(publicId, {
              resource_type: resourceType,
              invalidate: true,
            })
            if (one?.result === 'ok' || one?.result === 'not found') deleted += 1
          } catch (destroyErr) {
            console.error('[cloudinary] destroy failed:', publicId, destroyErr?.message || destroyErr)
          }
        }
      }
    }
  }
  return { deleted, skipped: false }
}

/** Remove Cloudinary blobs for SurveyFile rows (by Mongo ids). */
export async function purgeCloudinaryForSurveyFileIds(companyId, fileObjectIds) {
  if (!fileObjectIds?.length) return
  const files = await SurveyFile.find({ companyId, _id: { $in: fileObjectIds } })
    .select('storageProvider key mimeType')
    .lean()
  const assets = files
    .filter((f) => f.storageProvider === 'cloudinary' && f.key)
    .map((f) => ({ publicId: f.key, mimeType: f.mimeType }))
  await deleteCloudinaryAssets(assets)
}

/** Remove Cloudinary images referenced only by denormalized visit `photoUrls`. */
export async function purgeCloudinaryForPhotoUrls(photoUrls) {
  const seen = new Set()
  const assets = []
  for (const url of photoUrls ?? []) {
    const publicId = publicIdFromCloudinaryUrl(url)
    if (publicId && !seen.has(publicId)) {
      seen.add(publicId)
      assets.push({ publicId, mimeType: 'image/jpeg' })
    }
  }
  await deleteCloudinaryAssets(assets)
}

/**
 * Delete visit photos from Cloudinary for one or more visits (file refs + legacy URLs).
 * @param {mongoose.Types.ObjectId|string} companyId
 * @param {{ photoFileIds?: unknown[], photoUrls?: string[] }[]} visits
 */
export async function purgeVisitPhotosFromCloudinary(companyId, visits) {
  const fileIdSet = new Set()
  const urls = []
  for (const v of visits ?? []) {
    for (const fid of v.photoFileIds ?? []) {
      if (fid) fileIdSet.add(fid.toString())
    }
    for (const u of v.photoUrls ?? []) {
      if (u) urls.push(u)
    }
  }
  const fileObjectIds = [...fileIdSet].map((id) => new mongoose.Types.ObjectId(id))
  await purgeCloudinaryForSurveyFileIds(companyId, fileObjectIds)
  await purgeCloudinaryForPhotoUrls(urls)
}

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
