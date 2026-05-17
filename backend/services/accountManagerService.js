import mongoose from 'mongoose'
import AccountManager from '../models/AccountManager.js'
import InstrumentAssignment from '../models/InstrumentAssignment.js'
import Client from '../models/Client.js'
import Site from '../models/Site.js'
import SiteVisit from '../models/SiteVisit.js'
import Transaction from '../models/Transaction.js'
import { ApiError } from '../utils/ApiError.js'
import { instrumentCoworkerAdminIdStrings } from '../utils/instrumentPeers.js'
import {
  instrumentScopeMatch,
  optionalAdminIdQuery,
  peerAwareAdminScopeMatch,
  resolveInstrumentScope,
} from '../utils/scope.js'
import { decAmount, effectivePaidAmount } from '../utils/visitPaymentMath.js'
import { visitDateRangeForYear } from '../utils/yearQuery.js'
import { reconcileSiteCreditsForAdmin } from './visitCreditAllocation.js'

function adminIdString(id) {
  if (id == null) return ''
  if (typeof id === 'object' && typeof id.toString === 'function') return id.toString()
  return String(id)
}

function managerAdminObjectId(managerDoc) {
  const raw = managerDoc?.adminId
  if (raw == null) throw new ApiError(500, 'Account manager has no linked admin')
  if (raw instanceof mongoose.Types.ObjectId) return raw
  if (mongoose.isValidObjectId(raw)) return new mongoose.Types.ObjectId(adminIdString(raw))
  throw new ApiError(500, 'Account manager has invalid admin reference')
}

/** True when both admins have an active assignment on at least one shared instrument. */
async function adminsShareInstrumentAssignment(req, otherAdminId) {
  const other = adminIdString(otherAdminId)
  if (!other || adminIdString(req.user.id) === other) return false
  const instrumentIds = await InstrumentAssignment.distinct('instrumentId', {
    companyId: req.user.companyId,
    adminId: req.user.id,
    isActive: true,
    revokedAt: { $exists: false },
  })
  if (!instrumentIds.length) return false
  const shared = await InstrumentAssignment.exists({
    companyId: req.user.companyId,
    adminId: other,
    instrumentId: { $in: instrumentIds },
    isActive: true,
    revokedAt: { $exists: false },
  })
  return Boolean(shared)
}

/**
 * Admins may read their own ledger or another admin's on the same active instrument (header).
 * Super-admins respect optional `adminId` query scope when set.
 */
export async function assertAccountManagerReadAccess(req, amLean) {
  const amAdminId = adminIdString(amLean?.adminId)
  if (!amAdminId) throw new ApiError(500, 'Account manager has no linked admin')

  if (req.user.role === 'super_admin') {
    const extra = optionalAdminIdQuery(req)
    if (extra.adminId && adminIdString(extra.adminId) !== amAdminId) {
      throw new ApiError(403, 'Forbidden')
    }
    return
  }
  if (req.user.role === 'admin') {
    if (adminIdString(req.user.id) === amAdminId) return
    const peers = await instrumentCoworkerAdminIdStrings(req)
    if (peers?.has(amAdminId) && peers.has(adminIdString(req.user.id))) return
    if (await adminsShareInstrumentAssignment(req, amAdminId)) return
    throw new ApiError(403, 'Forbidden')
  }
}

function formatInr(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

/**
 * Client rows visible on a ledger page. Admins on the same instrument share clients/sites/visits;
 * debit/credit/net stay scoped to the viewed account manager. Super-admins see the manager's slice.
 */
async function sharedClientAdminScope(req, managerDoc) {
  if (req.user.role === 'super_admin') {
    return { adminId: managerAdminObjectId(managerDoc) }
  }
  const peerScope = await peerAwareAdminScopeMatch(req)
  if (peerScope.adminId?.$in) return peerScope
  return { adminId: managerAdminObjectId(managerDoc) }
}

export async function listAccountManagers(req) {
  const q = optionalAdminIdQuery(req)
  const match = { companyId: req.user.companyId, isActive: true, ...q }
  if (req.user.role === 'admin') {
    Object.assign(match, await peerAwareAdminScopeMatch(req))
  }
  const rows = await AccountManager.find(match).sort({ fullName: 1 }).lean()
  return rows.map((r) => ({
    id: r.slug,
    _id: r._id.toString(),
    adminId: r.adminId?.toString() ?? '',
    name: r.fullName,
    shortName: r.shortName || r.fullName,
    phone: r.phone ?? '',
  }))
}

export async function getAccountManagerBySlug(req, slug) {
  const match = { companyId: req.user.companyId, slug, isActive: true }
  if (req.user.role === 'super_admin') {
    const extra = optionalAdminIdQuery(req)
    if (extra.adminId) match.adminId = extra.adminId
  }
  const am = await AccountManager.findOne(match).lean()
  if (!am) throw new ApiError(404, 'Account manager not found')
  await assertAccountManagerReadAccess(req, am)
  return am
}

/**
 * Financial summary for one account manager ledger (scoped by adminId / accountManagerId, not instrument).
 */
export async function getLedgerSummaryForManager(req, managerDoc, yearRaw) {
  const adminId = managerAdminObjectId(managerDoc)
  await reconcileSiteCreditsForAdmin(req.user.companyId, adminId)

  const visitYearRange = visitDateRangeForYear(yearRaw)
  const txMatch = {
    companyId: req.user.companyId,
    accountManagerId: managerDoc._id,
    ...(visitYearRange ? { occurredOn: visitYearRange } : {}),
  }
  const txs = await Transaction.find(txMatch).select('type amount').lean()
  let totalDebit = 0
  let totalCredit = 0
  for (const t of txs) {
    const a = decAmount(t.amount)
    if (t.type === 'debit') totalDebit += a
    else totalCredit += a
  }

  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const clients = await Client.find({
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await sharedClientAdminScope(req, managerDoc)),
  })
    .select('_id')
    .lean()
  let pendingTotal = 0
  if (clients.length > 0) {
    const clientIds = clients.map((c) => c._id)
    const visitMatch = { clientId: { $in: clientIds }, ...(visitYearRange ? { visitDate: visitYearRange } : {}) }
    const visits = await SiteVisit.find(visitMatch).select('amount paymentStatus paidAmount').lean()
    let revenue = 0
    let received = 0
    for (const v of visits) {
      revenue += decAmount(v.amount)
      received += effectivePaidAmount(v)
    }
    pendingTotal = Math.max(0, revenue - received)
  }

  const globalPendingTotal = await getGlobalPendingTotal(req, yearRaw)

  return {
    totalDebit,
    totalCredit,
    netBalance: totalCredit - totalDebit,
    pendingTotal,
    globalPendingTotal,
  }
}

/**
 * Company-wide pending from all site visits (scoped by instrument / peer access),
 * shared across account managers. Debit/credit/balance remain per manager.
 */
export async function getGlobalPendingTotal(req, yearRaw) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const visitYearRange = visitDateRangeForYear(yearRaw)
  const visitMatch = {
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await peerAwareAdminScopeMatch(req)),
    ...(visitYearRange ? { visitDate: visitYearRange } : {}),
  }
  const visits = await SiteVisit.find(visitMatch).select('amount paymentStatus paidAmount').lean()
  let revenue = 0
  let received = 0
  for (const v of visits) {
    revenue += decAmount(v.amount)
    received += effectivePaidAmount(v)
  }
  return Math.max(0, revenue - received)
}

/** Client → site names for credit transaction dropdowns (scoped to manager's adminId). */
export async function listClientSiteOptionsForManager(req, managerDoc) {
  await assertAccountManagerReadAccess(req, managerDoc)
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const clients = await Client.find({
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await sharedClientAdminScope(req, managerDoc)),
  })
    .select('name')
    .sort({ name: 1 })
    .limit(500)
    .lean()
  if (clients.length === 0) return {}

  const clientIds = clients.map((c) => c._id)
  const sites = await Site.find({
    companyId: req.user.companyId,
    clientId: { $in: clientIds },
  })
    .select('name clientId')
    .sort({ name: 1 })
    .lean()

  const clientNameById = new Map(clients.map((c) => [c._id.toString(), c.name]))
  const out = {}
  for (const c of clients) {
    out[c.name] = []
  }
  for (const s of sites) {
    const name = clientNameById.get(s.clientId?.toString())
    if (name && out[name]) out[name].push(s.name)
  }
  return out
}

export async function listAccountRowsForManager(req, managerDoc, yearRaw) {
  const adminId = managerAdminObjectId(managerDoc)
  await reconcileSiteCreditsForAdmin(req.user.companyId, adminId)

  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const visitYearRange = visitDateRangeForYear(yearRaw)
  const clients = await Client.find({
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await sharedClientAdminScope(req, managerDoc)),
  })
    .select('name phone')
    .sort({ name: 1 })
    .limit(500)
    .lean()
  if (clients.length === 0) return []

  const clientIds = clients.map((c) => c._id)
  const visitMatch = { clientId: { $in: clientIds }, ...(visitYearRange ? { visitDate: visitYearRange } : {}) }
  const visits = await SiteVisit.find(visitMatch)
    .select('clientId amount paymentStatus paidAmount')
    .lean()
  const byClient = new Map()
  for (const v of visits) {
    const id = v.clientId?.toString()
    if (!id) continue
    if (!byClient.has(id)) byClient.set(id, { revenue: 0, received: 0 })
    const row = byClient.get(id)
    const a = decAmount(v.amount)
    row.revenue += a
    row.received += effectivePaidAmount(v)
  }

  const txMatch = {
    companyId: req.user.companyId,
    accountManagerId: managerDoc._id,
    clientId: { $in: clientIds },
    ...(visitYearRange ? { occurredOn: visitYearRange } : {}),
  }
  const txs = await Transaction.find(txMatch).select('clientId type amount').lean()
  const txByClient = new Map()
  for (const t of txs) {
    const id = t.clientId?.toString()
    if (!id) continue
    if (!txByClient.has(id)) txByClient.set(id, { debit: 0, credit: 0 })
    const row = txByClient.get(id)
    const a = decAmount(t.amount)
    if (t.type === 'debit') row.debit += a
    else row.credit += a
  }

  return clients.map((c) => {
    const agg = byClient.get(c._id.toString()) ?? { revenue: 0, received: 0 }
    const txAgg = txByClient.get(c._id.toString()) ?? { debit: 0, credit: 0 }
    const pending = Math.max(0, agg.revenue - agg.received)
    return {
      name: c.name,
      phone: c.phone ?? '',
      totalRevenue: formatInr(agg.revenue),
      received: formatInr(agg.received),
      pending: formatInr(pending),
      debit: formatInr(txAgg.debit),
      credit: formatInr(txAgg.credit),
    }
  })
}
