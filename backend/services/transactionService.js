import mongoose from 'mongoose'
import Transaction from '../models/Transaction.js'
import AccountManager from '../models/AccountManager.js'
import Client from '../models/Client.js'
import Site from '../models/Site.js'
import SiteVisit from '../models/SiteVisit.js'
import { ApiError } from '../utils/ApiError.js'
import { resolveInstrumentScope, optionalAdminIdQuery, instrumentScopeMatch, peerAwareAdminScopeMatch } from '../utils/scope.js'
import { visitDateRangeForYear } from '../utils/yearQuery.js'
import * as accountManagerService from './accountManagerService.js'
import { recomputeVisitCreditsForSite } from './visitCreditAllocation.js'

function decNum(v) {
  return parseFloat((v ?? 0).toString()) || 0
}

function toDec128(n) {
  return mongoose.Types.Decimal128.fromString((Number(n) || 0).toFixed(2))
}

export async function listTransactions(req, accountManagerId) {
  const am = await AccountManager.findOne({
    _id: accountManagerId,
    companyId: req.user.companyId,
    ...(req.user.role === 'super_admin' ? optionalAdminIdQuery(req) : {}),
  }).lean()
  if (!am) throw new ApiError(404, 'Account manager not found')
  await accountManagerService.assertAccountManagerReadAccess(req, am)
  const yearRange = visitDateRangeForYear(req.query?.year)
  const rows = await Transaction.find({
    companyId: req.user.companyId,
    accountManagerId: am._id,
    ...(yearRange ? { occurredOn: yearRange } : {}),
  })
    .populate('clientId', 'name')
    .populate('siteId', 'name')
    .sort({ occurredOn: -1 })
    .limit(500)
    .lean()
  return rows.map((t) => ({
    id: t._id.toString(),
    type: t.type,
    amount: decNum(t.amount),
    date: t.occurredOn.toISOString().slice(0, 10),
    reason: t.reason,
    client: t.clientId?.name,
    site: t.siteId?.name,
  }))
}


export async function createTransaction(req, accountManagerId, body) {
  const { allowedInstrumentIds, effectiveInstrumentId } = await resolveInstrumentScope(req)
  const am = await AccountManager.findOne({
    _id: accountManagerId,
    companyId: req.user.companyId,
    ...(req.user.role === 'admin' ? { adminId: req.user.id } : {}),
  })
  if (!am) throw new ApiError(404, 'Account manager not found')

  let clientId
  let siteId
  /** When crediting a site, visits are keyed by the site's instrument — not only the active header instrument. */
  let siteInstrumentId
  if (body.clientName) {
    const c = await Client.findOne({
      companyId: req.user.companyId,
      adminId: am.adminId,
      name: new RegExp(`^${escape(body.clientName.trim())}$`, 'i'),
    })
    if (c) clientId = c._id
  }
  if (body.siteName && clientId) {
    const s = await Site.findOne({ clientId, name: new RegExp(`^${escape(body.siteName.trim())}$`, 'i') })
      .select('_id instrumentId')
      .lean()
    if (s) {
      siteId = s._id
      siteInstrumentId = s.instrumentId
    }
  }

  let siteVisitObjectId
  const rawVisitId = typeof body.siteVisitId === 'string' ? body.siteVisitId.trim() : ''
  if (rawVisitId && mongoose.isValidObjectId(rawVisitId)) {
    const v = await SiteVisit.findOne({
      _id: rawVisitId,
      companyId: req.user.companyId,
      ...instrumentScopeMatch(allowedInstrumentIds),
      ...(await peerAwareAdminScopeMatch(req)),
    })
      .select('_id siteId clientId instrumentId')
      .lean()
    if (!v) throw new ApiError(404, 'Site visit not found')
    if (siteId != null && !v.siteId.equals(siteId)) {
      throw new ApiError(400, 'siteVisitId does not match the selected site')
    }
    if (!siteId) {
      siteId = v.siteId
      siteInstrumentId = v.instrumentId
    }
    if (!clientId && v.clientId) {
      clientId = v.clientId
    }
    siteVisitObjectId = v._id
  }

  const instrumentId = siteInstrumentId ?? effectiveInstrumentId ?? allowedInstrumentIds[0]

  const txPayload = {
    companyId: req.user.companyId,
    adminId: am.adminId,
    accountManagerId: am._id,
    instrumentId,
    type: body.type,
    amount: toDec128(body.amount),
    occurredOn: body.date ? new Date(body.date) : new Date(),
    reason: body.reason?.trim(),
    clientId,
    siteId,
    ...(siteVisitObjectId ? { siteVisitId: siteVisitObjectId } : {}),
  }

  const creditAmount = Number(body.amount) || 0
  const allocateCredit =
    body.type === 'credit' && siteId != null && instrumentId != null && Number.isFinite(creditAmount) && creditAmount > 0

  if (!allocateCredit) {
    const t = await Transaction.create(txPayload)
    return {
      id: t._id.toString(),
      type: t.type,
      amount: Number(body.amount) || 0,
      date: t.occurredOn.toISOString().slice(0, 10),
      reason: t.reason,
      client: body.clientName,
      site: body.siteName,
    }
  }

  const session = await mongoose.startSession()
  let created
  try {
    await session.withTransaction(async () => {
      const [t] = await Transaction.create([txPayload], { session })
      created = t
      await recomputeVisitCreditsForSite(session, {
        companyId: req.user.companyId,
        adminId: am.adminId,
        siteId,
      })
    })
  } finally {
    await session.endSession()
  }

  return {
    id: created._id.toString(),
    type: created.type,
    amount: Number(body.amount) || 0,
    date: created.occurredOn.toISOString().slice(0, 10),
    reason: created.reason,
    client: body.clientName,
    site: body.siteName,
  }
}

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function deleteTransaction(req, txId) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const t = await Transaction.findOneAndDelete({
    _id: txId,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(req.user.role === 'admin' ? { adminId: req.user.id } : {}),
  })
  if (!t) throw new ApiError(404, 'Transaction not found')

  const shouldRecompute = t.type === 'credit' && t.siteId != null
  if (shouldRecompute) {
    await recomputeVisitCreditsForSite(null, {
      companyId: t.companyId,
      adminId: t.adminId,
      siteId: t.siteId,
    })
  }

  return { ok: true }
}
