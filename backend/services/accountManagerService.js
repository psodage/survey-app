import AccountManager from '../models/AccountManager.js'
import Client from '../models/Client.js'
import SiteVisit from '../models/SiteVisit.js'
import Site from '../models/Site.js'
import { ApiError } from '../utils/ApiError.js'
import { instrumentCoworkerAdminIdStrings } from '../utils/instrumentPeers.js'
import { optionalAdminIdQuery, peerAwareAdminScopeMatch } from '../utils/scope.js'
import { decAmount, effectivePaidAmount } from '../utils/visitPaymentMath.js'

/**
 * Admins may read their own ledger or another admin's on the same active instrument (header).
 * Super-admins respect optional `adminId` query scope when set.
 */
export async function assertAccountManagerReadAccess(req, amLean) {
  if (req.user.role === 'super_admin') {
    const extra = optionalAdminIdQuery(req)
    if (extra.adminId && !amLean.adminId.equals(extra.adminId)) {
      throw new ApiError(403, 'Forbidden')
    }
    return
  }
  if (req.user.role === 'admin') {
    if (amLean.adminId.equals(req.user.id)) return
    const peers = await instrumentCoworkerAdminIdStrings(req)
    if (!peers || !peers.has(amLean.adminId.toString()) || !peers.has(req.user.id.toString())) {
      throw new ApiError(403, 'Forbidden')
    }
  }
}

function formatInr(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
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

export async function listAccountRowsForManager(req, managerDoc) {
  const clients = await Client.find({
    companyId: req.user.companyId,
    adminId: managerDoc.adminId,
  })
    .select('name phone')
    .sort({ name: 1 })
    .limit(500)
    .lean()
  if (clients.length === 0) return []

  const clientIds = clients.map((c) => c._id)
  const visits = await SiteVisit.find({ clientId: { $in: clientIds } })
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

  return clients.map((c) => {
    const agg = byClient.get(c._id.toString()) ?? { revenue: 0, received: 0 }
    const pending = Math.max(0, agg.revenue - agg.received)
    return {
      name: c.name,
      phone: c.phone ?? '',
      totalRevenue: formatInr(agg.revenue),
      received: formatInr(agg.received),
      pending: formatInr(pending),
      debit: formatInr(0),
      credit: formatInr(agg.received),
    }
  })
}
