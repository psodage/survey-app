import mongoose from 'mongoose'
import Site from '../models/Site.js'
import Client from '../models/Client.js'
import SiteVisit from '../models/SiteVisit.js'
import Transaction from '../models/Transaction.js'
import Invoice from '../models/Invoice.js'
import SurveyFile from '../models/SurveyFile.js'
import { ApiError } from '../utils/ApiError.js'
import { resolveInstrumentScope, sharedInstrumentOperationalScope } from '../utils/scope.js'
import { visitDateRangeForYear } from '../utils/yearQuery.js'
import { decAmount, effectivePaidAmount } from '../utils/visitPaymentMath.js'
import * as uploadService from './uploadService.js'

function formatInr(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function statusLabel(s) {
  if (s === 'active') return 'Active'
  if (s === 'on_hold') return 'On Hold'
  return 'Completed'
}

async function siteFinancials(siteId, visitDateRange) {
  const q = { siteId, ...(visitDateRange ? { visitDate: visitDateRange } : {}) }
  const visits = await SiteVisit.find(q).select('amount paymentStatus paidAmount').lean()
  let total = 0
  let received = 0
  for (const v of visits) {
    const a = decAmount(v.amount)
    total += a
    received += effectivePaidAmount(v)
  }
  return { revenue: total, received, pending: Math.max(0, total - received) }
}

async function lastVisitLabelForSite(siteId, visitDateRange, fallbackLastVisitAt) {
  if (!visitDateRange) {
    if (!fallbackLastVisitAt) return '—'
    return new Date(fallbackLastVisitAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  const v = await SiteVisit.findOne({ siteId, visitDate: visitDateRange })
    .sort({ visitDate: -1 })
    .select('visitDate')
    .lean()
  if (!v?.visitDate) return '—'
  return new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export async function listSitesForClient(req, clientId) {
  const client = await Client.findOne({
    _id: clientId,
    companyId: req.user.companyId,
    ...(await sharedInstrumentOperationalScope(req)),
  }).lean()
  if (!client) throw new ApiError(404, 'Client not found')

  const visitYearRange = visitDateRangeForYear(req.query?.year)
  const sites = await Site.find({ clientId, companyId: req.user.companyId })
    .select('name locationLabel address status lastVisitAt updatedAt')
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean()
  const out = []
  for (const s of sites) {
    const { received, pending } = await siteFinancials(s._id, visitYearRange)
    const lastVisit = await lastVisitLabelForSite(s._id, visitYearRange, s.lastVisitAt)
    out.push({
      id: s._id.toString(),
      name: s.name,
      location: s.locationLabel || s.address || '—',
      lastVisit,
      status: statusLabel(s.status),
      received: formatInr(received),
      pending: formatInr(pending),
    })
  }
  return out
}

export async function createSite(req, { clientId, name, locationLabel }) {
  const { effectiveInstrumentId, allowedInstrumentIds } = await resolveInstrumentScope(req)
  const client = await Client.findOne({
    _id: clientId,
    companyId: req.user.companyId,
    ...(await sharedInstrumentOperationalScope(req)),
  })
  if (!client) throw new ApiError(404, 'Client not found')
  const site = await Site.create({
    companyId: req.user.companyId,
    adminId: client.adminId,
    instrumentId: effectiveInstrumentId ?? client.instrumentId,
    clientId: client._id,
    name: name.trim(),
    locationLabel: locationLabel?.trim(),
    status: 'active',
  })
  return {
    id: site._id.toString(),
    name: site.name,
    location: site.locationLabel || '—',
    lastVisit: '—',
    status: 'Active',
    received: formatInr(0),
    pending: formatInr(0),
  }
}

export async function listAllSites(req) {
  const visitYearRange = visitDateRangeForYear(req.query?.year)
  const match = {
    companyId: req.user.companyId,
    ...(await sharedInstrumentOperationalScope(req)),
  }
  const sites = await Site.find(match)
    .select('name locationLabel address status lastVisitAt updatedAt clientId instrumentId')
    .populate('clientId', 'name')
    .populate('instrumentId', 'name category')
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean()
  const out = []
  for (const s of sites) {
    const { received, pending } = await siteFinancials(s._id, visitYearRange)
    const lastVisit = await lastVisitLabelForSite(s._id, visitYearRange, s.lastVisitAt)
    const inst = s.instrumentId && typeof s.instrumentId === 'object' ? s.instrumentId : null
    out.push({
      id: s._id.toString(),
      clientName: s.clientId?.name ?? '',
      name: s.name,
      location: s.locationLabel || s.address || '—',
      lastVisit,
      status: statusLabel(s.status),
      received: formatInr(received),
      pending: formatInr(pending),
      instrumentName: inst?.name ?? '',
      instrumentCategory: inst?.category ?? '',
    })
  }
  return out
}

/**
 * Removes one site plus its visits, invoices tied to that site or those visits,
 * related transactions, and linked survey files (Cloudinary + DB).
 */
export async function deleteSiteWithRelated(req, siteId) {
  const site = await Site.findOne({
    _id: siteId,
    companyId: req.user.companyId,
    ...(await sharedInstrumentOperationalScope(req)),
  }).select('_id adminId')
  if (!site) throw new ApiError(404, 'Site not found')
  if (req.user.role === 'admin' && site.adminId?.toString() !== req.user.id.toString()) {
    throw new ApiError(403, 'Forbidden')
  }

  const visits = await SiteVisit.find({ siteId: site._id, companyId: req.user.companyId })
    .select('_id photoFileIds photoUrls invoiceId')
    .lean()
  const visitIds = visits.map((v) => v._id)
  const visitInvoiceIds = [...new Set(visits.map((v) => v.invoiceId).filter(Boolean).map((id) => id.toString()))].map(
    (id) => new mongoose.Types.ObjectId(id),
  )

  const invoiceOr = [{ siteId: site._id }]
  if (visitIds.length) invoiceOr.push({ siteVisitIds: { $in: visitIds } })
  if (visitInvoiceIds.length) invoiceOr.push({ _id: { $in: visitInvoiceIds } })

  const invoices = await Invoice.find({
    companyId: req.user.companyId,
    $or: invoiceOr,
  })
    .select('pdfFileId')
    .lean()

  const fileIdSet = new Set()
  for (const v of visits) {
    for (const fid of v.photoFileIds ?? []) {
      if (fid) fileIdSet.add(fid.toString())
    }
  }
  for (const inv of invoices) {
    if (inv.pdfFileId) fileIdSet.add(inv.pdfFileId.toString())
  }
  const fileObjectIds = [...fileIdSet].map((id) => new mongoose.Types.ObjectId(id))

  const txOr = [{ siteId: site._id }]
  if (visitIds.length) txOr.push({ siteVisitId: { $in: visitIds } })

  if (fileObjectIds.length) {
    await uploadService.purgeCloudinaryForSurveyFileIds(req.user.companyId, fileObjectIds)
  }
  await uploadService.purgeCloudinaryForPhotoUrls(visits.flatMap((v) => v.photoUrls ?? []))

  await Transaction.deleteMany({ companyId: req.user.companyId, $or: txOr })
  await Invoice.deleteMany({ companyId: req.user.companyId, $or: invoiceOr })
  await SiteVisit.deleteMany({ siteId: site._id, companyId: req.user.companyId })
  if (fileObjectIds.length) {
    await SurveyFile.deleteMany({ companyId: req.user.companyId, _id: { $in: fileObjectIds } })
  }
  await Site.deleteOne({ _id: site._id, companyId: req.user.companyId })
}
