import mongoose from 'mongoose'
import Client from '../models/Client.js'
import Site from '../models/Site.js'
import SiteVisit from '../models/SiteVisit.js'
import User from '../models/User.js'
import AccountManager from '../models/AccountManager.js'
import Transaction from '../models/Transaction.js'
import Invoice from '../models/Invoice.js'
import SurveyFile from '../models/SurveyFile.js'
import { ApiError } from '../utils/ApiError.js'
import * as uploadService from './uploadService.js'
import { parseObjectId } from '../utils/instrumentAccess.js'
import {
  resolveInstrumentScope,
  optionalAdminIdQuery,
  instrumentScopeMatch,
  peerAwareAdminScopeMatch,
} from '../utils/scope.js'
import { decAmount, effectivePaidAmount } from '../utils/visitPaymentMath.js'
import { visitDateRangeForYear } from '../utils/yearQuery.js'

function formatInr(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function trimStr(v) {
  return typeof v === 'string' ? v.trim() : ''
}

function formatDateIn(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function populatedDocName(ref) {
  if (ref && typeof ref === 'object' && ref.name) return String(ref.name)
  return '—'
}

async function clientFinancials(clientId, visitDateRange) {
  const q = { clientId, ...(visitDateRange ? { visitDate: visitDateRange } : {}) }
  const visits = await SiteVisit.find(q).select('amount paymentStatus paidAmount').lean()
  let revenue = 0
  let received = 0
  for (const v of visits) {
    const a = decAmount(v.amount)
    revenue += a
    received += effectivePaidAmount(v)
  }
  const pending = Math.max(0, revenue - received)
  return { revenue, received, pending }
}

async function siteFinancials(siteId, visitDateRange) {
  const q = { siteId, ...(visitDateRange ? { visitDate: visitDateRange } : {}) }
  const visits = await SiteVisit.find(q).select('amount paymentStatus paidAmount').lean()
  let revenue = 0
  let received = 0
  for (const v of visits) {
    const a = decAmount(v.amount)
    revenue += a
    received += effectivePaidAmount(v)
  }
  return { revenue, received, pending: Math.max(0, revenue - received) }
}

export async function listClients(req) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const adminQ = optionalAdminIdQuery(req)
  const visitYearRange = visitDateRangeForYear(req.query?.year)
  const match = {
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await peerAwareAdminScopeMatch(req)),
    ...adminQ,
  }
  const clients = await Client.find(match)
    .select('name phone updatedAt')
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean()
  const out = []
  for (const c of clients) {
    const sites = await Site.countDocuments({ clientId: c._id })
    const { revenue, received, pending } = await clientFinancials(c._id, visitYearRange)
    out.push({
      id: c._id.toString(),
      name: c.name,
      phone: c.phone ?? '',
      sites,
      revenue: formatInr(revenue),
      received: formatInr(received),
      pending: formatInr(pending),
    })
  }
  return out
}

export async function createClient(req, body) {
  const { effectiveInstrumentId, allowedInstrumentIds } = await resolveInstrumentScope(req)
  if (
    !effectiveInstrumentId ||
    !allowedInstrumentIds.some((id) => id != null && id.equals(effectiveInstrumentId))
  ) {
    throw new ApiError(400, 'No instrument available')
  }
  let adminId
  if (req.user.role === 'super_admin') {
    const raw = typeof body.adminId === 'string' ? body.adminId.trim() : ''
    if (raw) {
      adminId = parseObjectId(raw, 'adminId')
      const assignee = await User.findOne({ _id: adminId, companyId: req.user.companyId }).select('role').lean()
      if (!assignee || assignee.role !== 'admin') {
        throw new ApiError(400, 'adminId must be an admin user in your company')
      }
    } else {
      adminId = new mongoose.Types.ObjectId(req.user.id)
    }
  } else {
    adminId = new mongoose.Types.ObjectId(req.user.id)
  }
  const dup = await Client.findOne({
    companyId: req.user.companyId,
    adminId,
    instrumentId: effectiveInstrumentId,
    name: new RegExp(`^${escapeRegex(body.name.trim())}$`, 'i'),
  })
  if (dup) throw new ApiError(409, 'A client with this name already exists')

  let client
  try {
    client = await Client.create({
      companyId: req.user.companyId,
      adminId,
      instrumentId: effectiveInstrumentId,
      name: body.name.trim(),
      phone: body.phone?.trim(),
      email: body.email?.trim()?.toLowerCase() || undefined,
      address: body.address?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
    })
  } catch (e) {
    if (e?.name === 'ValidationError') {
      const msg = Object.values(e.errors ?? {})
        .map((x) => x.message)
        .filter(Boolean)
        .join('; ')
      throw new ApiError(400, msg || 'Invalid client data')
    }
    if (e?.code === 11000) {
      throw new ApiError(409, 'A client with this name already exists')
    }
    throw e
  }

  return {
    id: client._id.toString(),
    name: client.name,
    phone: client.phone ?? '',
    sites: 0,
    revenue: '₹0',
    received: '₹0',
    pending: '₹0',
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function getClientReportExport(req, clientId, yearRaw) {
  const client = await getClientById(req, clientId)
  const visitYearRange = visitDateRangeForYear(yearRaw)

  const sites = await Site.find({ clientId: client._id, companyId: req.user.companyId })
    .select('name locationLabel address status lastVisitAt')
    .sort({ name: 1 })
    .lean()

  const siteRows = []
  for (const s of sites) {
    const { received, pending } = await siteFinancials(s._id, visitYearRange)
    const lastVisit = visitYearRange
      ? await SiteVisit.findOne({ siteId: s._id, visitDate: visitYearRange })
          .sort({ visitDate: -1 })
          .select('visitDate')
          .lean()
      : null
    const lastVisitLabel = lastVisit?.visitDate
      ? new Date(lastVisit.visitDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : s.lastVisitAt
        ? new Date(s.lastVisitAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '—'
    siteRows.push({
      name: s.name,
      location: s.locationLabel || s.address || '—',
      lastVisit: lastVisitLabel,
      status: s.status === 'on_hold' ? 'On Hold' : s.status === 'completed' ? 'Completed' : 'Active',
      pending: formatInr(pending),
    })
  }

  const visitMatch = { clientId: client._id, ...(visitYearRange ? { visitDate: visitYearRange } : {}) }
  const visits = await SiteVisit.find(visitMatch)
    .select('visitCode visitNo visitDate machineLabel paymentMode paymentStatus amount siteId')
    .populate('siteId', 'name')
    .sort({ visitDate: -1 })
    .limit(500)
    .lean()

  const visitRows = visits.map((v) => ({
    id: v.visitCode || v._id.toString(),
    visitNo: v.visitNo,
    date: formatDateIn(v.visitDate),
    site: populatedDocName(v.siteId),
    machine: trimStr(v.machineLabel) || '—',
    paymentMode: trimStr(v.paymentMode) || '—',
    paymentStatus: trimStr(v.paymentStatus) || 'pending',
    amount: formatInr(decAmount(v.amount)),
  }))

  const creditMatch = {
    companyId: req.user.companyId,
    clientId: client._id,
    type: 'credit',
    ...(visitYearRange ? { occurredOn: visitYearRange } : {}),
  }
  if (req.user.role === 'admin') {
    const ownAm = await AccountManager.findOne({
      companyId: req.user.companyId,
      adminId: req.user.id,
      isActive: true,
    })
      .select('_id')
      .lean()
    if (ownAm) creditMatch.accountManagerId = ownAm._id
  }
  const credits = await Transaction.find(creditMatch)
    .populate('siteId', 'name')
    .populate('accountManagerId', 'fullName shortName')
    .sort({ occurredOn: -1 })
    .limit(500)
    .lean()

  const creditRows = credits.map((t) => {
    const reason = trimStr(t.reason)
    const am =
      t.accountManagerId && typeof t.accountManagerId === 'object' ? t.accountManagerId : null
    return {
      date: formatDateIn(t.occurredOn),
      site: populatedDocName(t.siteId),
      amount: formatInr(decAmount(t.amount)),
      paymentMode: reason || 'Credit',
      receivedBy: (am && (trimStr(am.fullName) || trimStr(am.shortName))) || '—',
      notes: trimStr(t.reference),
    }
  })

  const { revenue, received, pending } = await clientFinancials(client._id, visitYearRange)
  const totalCredit = credits.reduce((sum, t) => sum + decAmount(t.amount), 0)

  return {
    client: {
      name: client.name,
      phone: client.phone ?? '',
      sites: sites.length,
      revenue: formatInr(revenue),
      received: formatInr(received),
      pending: formatInr(pending),
    },
    sites: siteRows,
    visits: visitRows,
    credits: creditRows,
    totals: {
      revenue,
      received,
      creditTotal: totalCredit,
      pending,
    },
  }
}

export async function getClientById(req, id) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const client = await Client.findOne({
    _id: id,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await peerAwareAdminScopeMatch(req)),
  }).lean()
  if (!client) throw new ApiError(404, 'Client not found')
  return client
}

/**
 * Permanently removes the client, all of its sites, visits, invoices, linked files
 * (including Cloudinary assets), and account-manager transactions that reference those records.
 */
export async function deleteClientWithSites(req, clientId) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const adminQ = optionalAdminIdQuery(req)
  const client = await Client.findOne({
    _id: clientId,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await peerAwareAdminScopeMatch(req)),
    ...adminQ,
  }).select('_id')
  if (!client) throw new ApiError(404, 'Client not found')

  const sites = await Site.find({ clientId: client._id, companyId: req.user.companyId }).select('_id').lean()
  const siteIds = sites.map((s) => s._id)

  const visits = await SiteVisit.find({ clientId: client._id, companyId: req.user.companyId })
    .select('_id photoFileIds photoUrls')
    .lean()
  const visitIds = visits.map((v) => v._id)

  const invoices = await Invoice.find({ clientId: client._id, companyId: req.user.companyId }).select('pdfFileId').lean()

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

  const txOr = [{ clientId: client._id }]
  if (siteIds.length) txOr.push({ siteId: { $in: siteIds } })
  if (visitIds.length) txOr.push({ siteVisitId: { $in: visitIds } })

  if (fileObjectIds.length) {
    await uploadService.purgeCloudinaryForSurveyFileIds(req.user.companyId, fileObjectIds)
  }
  await uploadService.purgeCloudinaryForPhotoUrls(visits.flatMap((v) => v.photoUrls ?? []))

  await Transaction.deleteMany({ companyId: req.user.companyId, $or: txOr })
  await Invoice.deleteMany({ companyId: req.user.companyId, clientId: client._id })
  await SiteVisit.deleteMany({ clientId: client._id, companyId: req.user.companyId })
  if (fileObjectIds.length) {
    await SurveyFile.deleteMany({ companyId: req.user.companyId, _id: { $in: fileObjectIds } })
  }
  const deletedSites = await Site.deleteMany({ clientId: client._id, companyId: req.user.companyId })
  await Client.deleteOne({ _id: client._id, companyId: req.user.companyId })

  return { sitesDeleted: deletedSites.deletedCount }
}
