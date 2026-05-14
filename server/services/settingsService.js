import Company from '../models/Company.js'
import User from '../models/User.js'
import SurveyFile from '../models/SurveyFile.js'
import mongoose from 'mongoose'
import Client from '../models/Client.js'
import Site from '../models/Site.js'
import * as uploadService from './uploadService.js'
import { ApiError } from '../utils/ApiError.js'

function bankLinesFromDetails(bd) {
  if (!bd?.accountName?.trim()) return null
  const ifsc = (bd.ifscCode ?? '').trim()
  const bankNm = (bd.bankName ?? '').trim()
  const ifscLine = bankNm ? `${ifsc} (${bankNm})` : ifsc
  return [
    `ACCOUNT NAME - ${bd.accountName.trim()}`,
    `ACCOUNT NO.- ${(bd.accountNumber ?? '').trim()}`,
    `IFSC CODE - ${ifscLine}`,
    `BRANCH- ${(bd.branch ?? '').trim()}`,
    '',
    `Google Pay/ Phonepe no.- ${(bd.upiPhone ?? '').trim()}`,
  ]
}

export async function getCompanySettings(req) {
  const company = await Company.findById(req.user.companyId)
    .populate([
      { path: 'branding.logoFileId', select: 'url sizeBytes mimeType updatedAt' },
      { path: 'invoiceDefaults.signatureFileId', select: 'url sizeBytes mimeType updatedAt' },
      { path: 'invoiceDefaults.stampFileId', select: 'url sizeBytes mimeType updatedAt' },
    ])
    .lean()
  if (!company) throw new ApiError(404, 'Company not found')

  const agg = await SurveyFile.aggregate([
    { $match: { companyId: company._id } },
    { $group: { _id: null, totalBytes: { $sum: '$sizeBytes' } } },
  ])
  const storageUsedBytes = agg[0]?.totalBytes ?? 0
  const quotaBytes = company.storageQuotaBytes ?? 25 * 1024 ** 3

  const logoMeta = company.branding?.logoFileId
  const sigMeta = company.invoiceDefaults?.signatureFileId
  const stampMeta = company.invoiceDefaults?.stampFileId

  return {
    name: company.name,
    legalName: company.legalName,
    ownerName: company.ownerName,
    contactPhone: company.contactPhone,
    email: company.email,
    officeAddress: company.officeAddress,
    gstNumber: company.gstNumber,
    settings: company.settings ?? {},
    invoiceDefaults: {
      theme: company.invoiceDefaults?.theme ?? 'modern',
      footerNote: company.invoiceDefaults?.footerNote ?? '',
      signatureUrl: sigMeta && typeof sigMeta === 'object' ? sigMeta.url : null,
      stampUrl: stampMeta && typeof stampMeta === 'object' ? stampMeta.url : null,
    },
    branding: {
      logoUrl: logoMeta && typeof logoMeta === 'object' ? logoMeta.url : null,
    },
    storage: {
      usedBytes: storageUsedBytes,
      quotaBytes,
      lastBackupAt: company.settings?.lastBackupAt ?? null,
      fileCount: await SurveyFile.countDocuments({ companyId: company._id }),
    },
  }
}

export async function updateCompanySettings(req, body) {
  if (req.user.role !== 'super_admin') throw new ApiError(403, 'Only super admin can update company settings')
  const company = await Company.findById(req.user.companyId)
  if (!company) throw new ApiError(404, 'Company not found')
  const topLevel = [
    'name',
    'legalName',
    'ownerName',
    'contactPhone',
    'email',
    'officeAddress',
    'gstNumber',
    'storageQuotaBytes',
  ]
  for (const k of topLevel) {
    if (body[k] !== undefined) company[k] = body[k]
  }
  if (body.settings && typeof body.settings === 'object') {
    company.settings = company.settings || {}
    Object.assign(company.settings, body.settings)
  }
  if (body.invoiceDefaults && typeof body.invoiceDefaults === 'object') {
    company.invoiceDefaults = company.invoiceDefaults || {}
    Object.assign(company.invoiceDefaults, body.invoiceDefaults)
  }
  await company.save()
  return { ok: true }
}

export async function getUserSettings(req) {
  const user = await User.findById(req.user.id)
    .select('profile preferences email bankDetails bankSignatureFileId')
    .populate({ path: 'bankSignatureFileId', select: 'url' })
    .lean()
  if (!user) throw new ApiError(404, 'User not found')
  const bankSig = user.bankSignatureFileId
  return {
    email: user.email,
    profile: user.profile,
    preferences: user.preferences,
    bankDetails: user.bankDetails ?? {},
    bankSignatureUrl: bankSig && typeof bankSig === 'object' ? bankSig.url ?? null : null,
  }
}

export async function updateUserSettings(req, body) {
  const user = await User.findById(req.user.id)
  if (!user) throw new ApiError(404, 'User not found')
  if (body.profile) {
    user.profile = user.profile || {}
    Object.assign(user.profile, body.profile)
  }
  if (body.preferences) {
    user.preferences = user.preferences || {}
    Object.assign(user.preferences, body.preferences)
  }
  if (body.bankDetails && typeof body.bankDetails === 'object') {
    user.bankDetails = user.bankDetails || {}
    const b = body.bankDetails
    for (const k of ['accountName', 'accountNumber', 'ifscCode', 'bankName', 'branch', 'upiPhone']) {
      if (b[k] !== undefined) user.bankDetails[k] = typeof b[k] === 'string' ? b[k].trim() : b[k]
    }
    if ('invoiceSlot' in b) {
      if (b.invoiceSlot === 1 || b.invoiceSlot === 2) user.bankDetails.invoiceSlot = b.invoiceSlot
      else user.bankDetails.invoiceSlot = undefined
    }
    user.markModified('bankDetails')
  }
  await user.save()
  return { ok: true }
}

/** Company letterhead text for PDF invoices (logo is always bundled `src/assets/logo.jpeg`). */
export async function getInvoiceCompanyHeader(req) {
  const company = await Company.findById(req.user.companyId).lean()
  if (!company) throw new ApiError(404, 'Company not found')
  return {
    companyName: company.name ?? '',
    email: company.email ?? '',
    officeAddress: company.officeAddress ?? '',
    gstNumber: (company.gstNumber ?? '').trim(),
    contactPhone: company.contactPhone ?? '',
  }
}

/** Dual-column bank panel for PDF invoices (left/right slots on user records). */
export async function getInvoiceBankColumns(req) {
  const companyId = req.user.companyId
  const [leftUser, rightUser] = await Promise.all([
    User.findOne({ companyId, 'bankDetails.invoiceSlot': 1 })
      .populate('bankSignatureFileId', 'url')
      .lean(),
    User.findOne({ companyId, 'bankDetails.invoiceSlot': 2 })
      .populate('bankSignatureFileId', 'url')
      .lean(),
  ])
  const leftLines = bankLinesFromDetails(leftUser?.bankDetails) ?? []
  const rightLines = bankLinesFromDetails(rightUser?.bankDetails) ?? []
  const leftSigUrl =
    leftUser?.bankSignatureFileId && typeof leftUser.bankSignatureFileId === 'object'
      ? leftUser.bankSignatureFileId.url ?? null
      : null
  const rightSigUrl =
    rightUser?.bankSignatureFileId && typeof rightUser.bankSignatureFileId === 'object'
      ? rightUser.bankSignatureFileId.url ?? null
      : null
  return {
    left: { lines: leftLines, signatureUrl: leftSigUrl },
    right: { lines: rightLines, signatureUrl: rightSigUrl },
  }
}

export async function attachUserBankSignature(req, file) {
  if (!file?.buffer) throw new ApiError(400, 'File is required')
  const uid = new mongoose.Types.ObjectId(req.user.id)
  const folder = `survey-app/user/${uid.toString()}/bank-signature`
  const up = await uploadService.uploadBufferToCloudinary({
    buffer: file.buffer,
    mimeType: file.mimetype,
    folder,
  })
  const reg = await uploadService.registerSurveyFile(req, {
    url: up.url,
    publicId: up.publicId,
    mimeType: file.mimetype,
    sizeBytes: up.bytes ?? file.size,
    linked: { entityType: 'user_bank_signature', entityId: uid },
  })
  const user = await User.findById(req.user.id)
  if (!user) throw new ApiError(404, 'User not found')
  user.bankSignatureFileId = reg.id
  await user.save()
  return { ok: true, url: up.url, fileId: reg.id }
}

export async function recordBackup(req) {
  if (req.user.role !== 'super_admin') throw new ApiError(403, 'Only super admin can create backups')
  const company = await Company.findById(req.user.companyId)
  if (!company) throw new ApiError(404, 'Company not found')
  company.settings = company.settings || {}
  company.settings.lastBackupAt = new Date()
  await company.save()
  return { ok: true, lastBackupAt: company.settings.lastBackupAt }
}

export async function attachCompanyLogo(req, file) {
  if (req.user.role !== 'super_admin') throw new ApiError(403, 'Only super admin can update the company logo')
  if (!file?.buffer) throw new ApiError(400, 'File is required')
  const companyId = req.user.companyId
  const up = await uploadService.uploadBufferToCloudinary({
    buffer: file.buffer,
    mimeType: file.mimetype,
    folder: `survey-app/company/${companyId}/logo`,
  })
  const reg = await uploadService.registerSurveyFile(req, {
    url: up.url,
    publicId: up.publicId,
    mimeType: file.mimetype,
    sizeBytes: up.bytes ?? file.size,
    linked: { entityType: 'company_branding', entityId: companyId },
  })
  const company = await Company.findById(companyId)
  if (!company) throw new ApiError(404, 'Company not found')
  company.branding = company.branding || {}
  company.branding.logoFileId = reg.id
  await company.save()
  return { ok: true, url: up.url, fileId: reg.id }
}

export async function attachInvoiceAsset(req, kind, file) {
  if (req.user.role !== 'super_admin') throw new ApiError(403, 'Only super admin can update invoice assets')
  if (!file?.buffer) throw new ApiError(400, 'File is required')
  if (kind !== 'signature' && kind !== 'stamp') throw new ApiError(400, 'Invalid asset kind')
  const companyId = req.user.companyId
  const entityType = kind === 'signature' ? 'invoice_signature' : 'invoice_stamp'
  const folder = `survey-app/company/${companyId}/${kind}`
  const up = await uploadService.uploadBufferToCloudinary({
    buffer: file.buffer,
    mimeType: file.mimetype,
    folder,
  })
  const reg = await uploadService.registerSurveyFile(req, {
    url: up.url,
    publicId: up.publicId,
    mimeType: file.mimetype,
    sizeBytes: up.bytes ?? file.size,
    linked: { entityType, entityId: companyId },
  })
  const company = await Company.findById(companyId)
  if (!company) throw new ApiError(404, 'Company not found')
  company.invoiceDefaults = company.invoiceDefaults || {}
  if (kind === 'signature') company.invoiceDefaults.signatureFileId = reg.id
  else company.invoiceDefaults.stampFileId = reg.id
  await company.save()
  return { ok: true, url: up.url, fileId: reg.id }
}

export async function getBackupSnapshot(req) {
  if (req.user.role !== 'super_admin') throw new ApiError(403, 'Only super admin can download backups')
  const companyId = req.user.companyId
  const company = await Company.findById(companyId).lean()
  if (!company) throw new ApiError(404, 'Company not found')

  const agg = await SurveyFile.aggregate([
    { $match: { companyId } },
    { $group: { _id: null, totalBytes: { $sum: '$sizeBytes' } } },
  ])
  const storageUsedBytes = agg[0]?.totalBytes ?? 0

  const [clientCount, siteCount, fileCount] = await Promise.all([
    Client.countDocuments({ companyId }),
    Site.countDocuments({ companyId }),
    SurveyFile.countDocuments({ companyId }),
  ])

  return {
    generatedAt: new Date().toISOString(),
    company: {
      name: company.name,
      ownerName: company.ownerName,
      email: company.email,
      settings: company.settings,
      invoiceDefaults: company.invoiceDefaults,
    },
    stats: {
      clients: clientCount,
      sites: siteCount,
      filesStored: fileCount,
      storageUsedBytes,
      storageQuotaBytes: company.storageQuotaBytes ?? 25 * 1024 ** 3,
    },
  }
}
