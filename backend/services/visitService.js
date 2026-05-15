import mongoose from 'mongoose'
import SiteVisit from '../models/SiteVisit.js'
import Site from '../models/Site.js'
import Client from '../models/Client.js'
import Counter from '../models/Counter.js'
import Invoice from '../models/Invoice.js'
import Transaction from '../models/Transaction.js'
import SurveyFile from '../models/SurveyFile.js'
import { ApiError } from '../utils/ApiError.js'
import { resolveInstrumentScope, adminIdFilter, instrumentScopeMatch, peerAwareAdminScopeMatch } from '../utils/scope.js'
import { visitDateRangeForYear } from '../utils/yearQuery.js'
import { owedAmount } from '../utils/visitPaymentMath.js'
import { recomputeVisitCreditsForSite } from './visitCreditAllocation.js'
import * as uploadService from './uploadService.js'

async function nextVisitCode(companyId) {
  const key = `visit:${companyId.toString()}`
  const c = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean()
  const n = c?.seq ?? 1
  return `SV-${4000 + n}`
}

function decToDisplay(n) {
  return `${Math.round(n).toLocaleString('en-IN')}`
}

function paymentLabel(s) {
  const m = { pending: 'Pending', partial: 'Partial', paid: 'Paid', waived: 'Waived' }
  return m[s] ?? s
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Billing lines as stored on SiteVisit → safe JSON for clients / PDF. */
function serializeBillingLines(billingLines) {
  if (!Array.isArray(billingLines) || billingLines.length === 0) return []
  return billingLines.map((row) => {
    const out = {
      particular: typeof row.particular === 'string' ? row.particular : '',
      quantity: Number(row.quantity) || 0,
      rate: Number(row.rate) || 0,
    }
    const a = Number(row.amount)
    if (Number.isFinite(a)) out.amount = a
    return out
  })
}

export async function listVisits(req) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const visitYearRange = visitDateRangeForYear(req.query?.year)
  const rawSiteId = typeof req.query?.siteId === 'string' ? req.query.siteId.trim() : ''
  let siteIdFilter = {}
  if (rawSiteId) {
    if (!mongoose.isValidObjectId(rawSiteId)) {
      return []
    }
    const sid = new mongoose.Types.ObjectId(rawSiteId)
    const site = await Site.findOne({
      _id: sid,
      companyId: req.user.companyId,
      ...instrumentScopeMatch(allowedInstrumentIds),
      ...(await peerAwareAdminScopeMatch(req)),
    })
      .select('_id')
      .lean()
    if (!site) {
      return []
    }
    siteIdFilter = { siteId: sid }
  }

  const match = {
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await peerAwareAdminScopeMatch(req)),
    ...siteIdFilter,
    ...(visitYearRange ? { visitDate: visitYearRange } : {}),
  }
  const visits = await SiteVisit.find(match)
    .select(
      'visitCode visitDate machineLabel workDescription amount paymentStatus paidAmount paymentMode notes photoUrls billingLines billingOtherCharges clientId siteId',
    )
    .sort({ visitDate: -1 })
    .limit(200)
    .populate('clientId', 'name')
    .populate('siteId', 'name')
    .lean()
  return visits.map((v) => ({
    id: v.visitCode || v._id.toString(),
    _id: v._id.toString(),
    visitMongoId: v._id.toString(),
    client: v.clientId?.name ?? '',
    site: v.siteId?.name ?? '',
    date: new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    machine: v.machineLabel ?? '—',
    work: v.workDescription ?? '',
    amount: decToDisplay(parseFloat((v.amount ?? 0).toString()) || 0),
    pendingAmount: decToDisplay(owedAmount(v)),
    paymentMode: v.paymentMode ?? '—',
    paymentStatus: paymentLabel(v.paymentStatus),
    notes: v.notes ?? '',
    photoUrls: v.photoUrls ?? [],
    billingLines: serializeBillingLines(v.billingLines),
    billingOtherCharges: Number.isFinite(Number(v.billingOtherCharges)) ? Number(v.billingOtherCharges) : 0,
  }))
}

export async function createVisit(req, body) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const site = await Site.findOne({
    _id: body.siteId,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await peerAwareAdminScopeMatch(req)),
  })
  if (!site) throw new ApiError(404, 'Site not found')

  const clientRow = await Client.findOne({ _id: site.clientId, companyId: req.user.companyId })
    .select('name')
    .lean()
  if (!clientRow) throw new ApiError(404, 'Client not found for this site')

  const visitCode = await nextVisitCode(req.user.companyId)
  const visitDate = body.visitDate ? new Date(body.visitDate) : new Date()
  const otherRaw = Number(body.billingOtherCharges)
  const other = Number.isFinite(otherRaw) ? otherRaw : 0

  const rawLines = Array.isArray(body.billingLines) ? body.billingLines : []
  const normalizedLines = rawLines
    .map((row) => {
      const particular = typeof row?.particular === 'string' ? row.particular.trim() : ''
      const quantity = Number(row?.quantity)
      const rate = Number(row?.rate)
      const lineAmtRaw = Number(row?.amount)
      const q = Number.isFinite(quantity) ? quantity : 0
      const r = Number.isFinite(rate) ? rate : 0
      const flat = Number.isFinite(lineAmtRaw) ? lineAmtRaw : 0
      const fromQtyRate = q !== 0 && r !== 0 ? q * r : 0
      const lineValue = fromQtyRate !== 0 ? fromQtyRate : flat
      if (!particular && lineValue === 0) return null
      if (q !== 0 && r !== 0) return { particular, quantity: q, rate: r }
      return { particular, quantity: 0, rate: 0, amount: flat }
    })
    .filter(Boolean)

  const qty = Number(body.billingQuantity)
  const rate = Number(body.billingRate)
  const hasMultiBilling = normalizedLines.length > 0
  const hasLegacyBilling = !hasMultiBilling && Number.isFinite(qty) && Number.isFinite(rate)

  let computedFromBilling = null
  let billingLinesToStore = undefined
  let billingParticularOut = body.billingParticular?.trim()
  let billingQuantityOut = undefined
  let billingRateOut = undefined
  let billingOtherChargesOut = undefined

  if (hasMultiBilling) {
    const subtotal = normalizedLines.reduce((sum, row) => {
      const q = row.quantity ?? 0
      const r = row.rate ?? 0
      if (q !== 0 && r !== 0) return sum + q * r
      const a = Number(row.amount)
      return sum + (Number.isFinite(a) ? a : 0)
    }, 0)
    computedFromBilling = Math.round(subtotal + other)
    billingLinesToStore = normalizedLines
    billingOtherChargesOut = other
    const joined = normalizedLines
      .map((row) => {
        const q = row.quantity ?? 0
        const r = row.rate ?? 0
        if (q !== 0 && r !== 0) return row.particular || `${q} × ${r}`
        const a = Number(row.amount)
        if (Number.isFinite(a) && a !== 0) return row.particular || `${a}`
        return row.particular || ''
      })
      .join(' · ')
    billingParticularOut = joined.slice(0, 500) || billingParticularOut
    if (normalizedLines.length === 1) {
      billingQuantityOut = normalizedLines[0].quantity
      billingRateOut = normalizedLines[0].rate
    }
  } else if (hasLegacyBilling) {
    computedFromBilling = Math.round(qty * rate + other)
    billingParticularOut = body.billingParticular?.trim()
    billingQuantityOut = qty
    billingRateOut = rate
    billingOtherChargesOut = other
  }

  const amountNum = computedFromBilling != null ? computedFromBilling : Number(body.amount) || 0
  const amountSafe = Number.isFinite(Number(amountNum)) ? Number(amountNum) : 0
  const paymentStatusRaw = String(body.paymentStatus || 'pending').toLowerCase()
  const paymentMap = { pending: 'pending', partial: 'partial', paid: 'paid', waived: 'waived' }
  const paymentStatus = paymentMap[paymentStatusRaw] ?? 'pending'

  const visit = await SiteVisit.create({
    companyId: req.user.companyId,
    adminId: site.adminId,
    instrumentId: site.instrumentId,
    clientId: site.clientId,
    siteId: site._id,
    visitCode,
    visitDate,
    workDescription: body.workDescription?.trim(),
    machineLabel: body.machineLabel?.trim(),
    billingLines: billingLinesToStore,
    billingParticular: billingParticularOut,
    billingQuantity: billingQuantityOut,
    billingRate: billingRateOut,
    billingOtherCharges: billingOtherChargesOut,
    amount: mongoose.Types.Decimal128.fromString(amountSafe.toFixed(2)),
    paymentMode: body.paymentMode?.trim(),
    paymentStatus,
    notes: body.notes?.trim(),
    photoUrls: [],
    photoFileIds: [],
  })

  site.lastVisitAt = visitDate
  await site.save()

  return {
    id: visit.visitCode,
    _id: visit._id.toString(),
    client: clientRow.name ?? '',
    site: site.name,
    date: new Date(visit.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    machine: visit.machineLabel ?? '',
    work: visit.workDescription ?? '',
    amount: decToDisplay(amountSafe),
    pendingAmount: decToDisplay(owedAmount(visit)),
    paymentMode: visit.paymentMode ?? '',
    paymentStatus: paymentLabel(visit.paymentStatus),
    notes: visit.notes ?? '',
    photoUrls: [],
    billingLines: serializeBillingLines(visit.billingLines),
    billingOtherCharges: Number.isFinite(Number(visit.billingOtherCharges)) ? Number(visit.billingOtherCharges) : 0,
  }
}

export async function getVisitById(req, visitId) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const visit = await SiteVisit.findOne({
    _id: visitId,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await peerAwareAdminScopeMatch(req)),
  })
    .populate('clientId', 'name')
    .populate('siteId', 'name')
    .lean()
  if (!visit) throw new ApiError(404, 'Visit not found')
  return {
    id: visit.visitCode || visit._id.toString(),
    _id: visit._id.toString(),
    client: visit.clientId?.name,
    site: visit.siteId?.name,
    date: new Date(visit.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    machine: visit.machineLabel,
    work: visit.workDescription,
    amount: decToDisplay(parseFloat((visit.amount ?? 0).toString()) || 0),
    pendingAmount: decToDisplay(owedAmount(visit)),
    paymentMode: visit.paymentMode,
    paymentStatus: paymentLabel(visit.paymentStatus),
    notes: visit.notes,
    photoUrls: visit.photoUrls ?? [],
    billingLines: serializeBillingLines(visit.billingLines),
    billingOtherCharges: Number.isFinite(Number(visit.billingOtherCharges)) ? Number(visit.billingOtherCharges) : 0,
  }
}

export async function appendVisitPhotos(req, visitId, { urls, fileIds }) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const visit = await SiteVisit.findOne({
    _id: visitId,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...adminIdFilter(req),
  })
  if (!visit) throw new ApiError(404, 'Visit not found')
  if (urls?.length) {
    visit.photoUrls = [...(visit.photoUrls ?? []), ...urls]
  }
  if (fileIds?.length) {
    visit.photoFileIds = [...(visit.photoFileIds ?? []), ...fileIds.map((id) => new mongoose.Types.ObjectId(id))]
  }
  await visit.save()
  return { photoUrls: visit.photoUrls, photoFileIds: visit.photoFileIds.map((x) => x.toString()) }
}

/**
 * Removes one site visit plus linked transactions, invoices that reference this visit,
 * visit photos (Cloudinary + DB), invoice PDF file rows, and refreshes the parent site's lastVisitAt.
 */
export async function deleteVisit(req, visitId) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const visit = await SiteVisit.findOne({
    _id: visitId,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await peerAwareAdminScopeMatch(req)),
  })
    .select('_id siteId clientId adminId instrumentId photoFileIds photoUrls invoiceId visitCode')
    .lean()
  if (!visit) throw new ApiError(404, 'Visit not found')

  const vid = visit._id
  const siteId = visit.siteId
  const invoiceOr = [{ siteVisitIds: vid }]
  if (visit.invoiceId) invoiceOr.push({ _id: visit.invoiceId })

  const invoices = await Invoice.find({
    companyId: req.user.companyId,
    $or: invoiceOr,
  })
    .select('pdfFileId')
    .lean()

  const fileIdSet = new Set()
  for (const fid of visit.photoFileIds ?? []) {
    if (fid) fileIdSet.add(fid.toString())
  }
  for (const inv of invoices) {
    if (inv.pdfFileId) fileIdSet.add(inv.pdfFileId.toString())
  }
  const fileObjectIds = [...fileIdSet].map((id) => new mongoose.Types.ObjectId(id))

  const txOr = [{ siteVisitId: vid }]
  const code = (visit.visitCode ?? '').trim()
  if (code) {
    txOr.push({
      type: 'debit',
      reason: new RegExp(escapeRegex(code), 'i'),
    })
  }
  if (fileObjectIds.length) {
    await uploadService.purgeCloudinaryForSurveyFileIds(req.user.companyId, fileObjectIds)
  }
  await uploadService.purgeCloudinaryForPhotoUrls(visit.photoUrls)

  await Transaction.deleteMany({ companyId: req.user.companyId, $or: txOr })
  await Invoice.deleteMany({ companyId: req.user.companyId, $or: invoiceOr })
  await SiteVisit.deleteOne({ _id: vid, companyId: req.user.companyId })
  if (fileObjectIds.length) {
    await SurveyFile.deleteMany({ companyId: req.user.companyId, _id: { $in: fileObjectIds } })
  }

  if (visit.adminId && visit.instrumentId) {
    await recomputeVisitCreditsForSite(null, {
      companyId: req.user.companyId,
      adminId: visit.adminId,
      siteId: visit.siteId,
      instrumentId: visit.instrumentId,
    })
  }

  const latest = await SiteVisit.findOne({ siteId, companyId: req.user.companyId })
    .sort({ visitDate: -1 })
    .select('visitDate')
    .lean()
  await Site.updateOne(
    { _id: siteId, companyId: req.user.companyId },
    { $set: { lastVisitAt: latest?.visitDate ?? null } },
  )
}
