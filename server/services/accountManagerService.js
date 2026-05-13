import mongoose from 'mongoose'
import AccountManager from '../models/AccountManager.js'
import Client from '../models/Client.js'
import SiteVisit from '../models/SiteVisit.js'
import Site from '../models/Site.js'
import InstrumentAssignment from '../models/InstrumentAssignment.js'
import { ApiError } from '../utils/ApiError.js'
import { optionalAdminIdQuery } from '../utils/scope.js'
import { decAmount, effectivePaidAmount } from '../utils/visitPaymentMath.js'

/** Distinct adminIds that have an active AccountManager row for this instrument (preferred). */
async function adminIdsOnInstrumentViaAccountManagers(req, instrumentObjectId) {
  const rows = await AccountManager.find({
    companyId: req.user.companyId,
    instrumentId: instrumentObjectId,
    isActive: true,
  })
    .select('adminId')
    .lean()
  if (!rows.length) return null
  return new Set(rows.map((r) => r.adminId.toString()))
}

/** Admin user ids sharing the active instrument: from AccountManager.instrumentId when present, else InstrumentAssignment. */
async function instrumentCoworkerAdminIdStrings(req) {
  const raw = typeof req.get === 'function' ? req.get('x-instrument-id')?.trim() : ''
  if (!raw || !mongoose.isValidObjectId(raw)) return null
  const instrumentId = new mongoose.Types.ObjectId(raw)
  const fromAm = await adminIdsOnInstrumentViaAccountManagers(req, instrumentId)
  if (fromAm && fromAm.size > 0) return fromAm

  const ids = await InstrumentAssignment.distinct('adminId', {
    companyId: req.user.companyId,
    instrumentId,
    isActive: true,
    revokedAt: { $exists: false },
  })
  return new Set(ids.map((id) => id.toString()))
}

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

async function clientRowForManager(adminId, companyId, client) {
  const visits = await SiteVisit.find({ clientId: client._id }).select('amount paymentStatus paidAmount').lean()
  let revenue = 0
  let received = 0
  for (const v of visits) {
    const a = decAmount(v.amount)
    revenue += a
    received += effectivePaidAmount(v)
  }
  const pending = Math.max(0, revenue - received)
  return {
    name: client.name,
    phone: client.phone ?? '',
    totalRevenue: formatInr(revenue),
    received: formatInr(received),
    pending: formatInr(pending),
    debit: formatInr(0),
    credit: formatInr(received),
  }
}

export async function listAccountManagers(req) {
  const q = optionalAdminIdQuery(req)
  const match = { companyId: req.user.companyId, isActive: true, ...q }
  if (req.user.role === 'admin') {
    match.adminId = req.user.id
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
  }).lean()
  const rows = []
  for (const c of clients) {
    rows.push(await clientRowForManager(managerDoc.adminId, req.user.companyId, c))
  }
  return rows
}
