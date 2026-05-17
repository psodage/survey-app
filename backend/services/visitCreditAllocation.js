import mongoose from 'mongoose'
import SiteVisit from '../models/SiteVisit.js'
import Transaction from '../models/Transaction.js'
import { owedAmount, effectivePaidAmount, decAmount } from '../utils/visitPaymentMath.js'

function toObjectId(v) {
  return v instanceof mongoose.Types.ObjectId ? v : new mongoose.Types.ObjectId(String(v))
}

/**
 * Apply a credit (FIFO by visitDate) to visits on the site that still owe money.
 * Updates paymentStatus and paidAmount. Unallocated surplus is left on the Transaction only.
 */
export async function applyCreditToSiteVisits(session, { companyId, siteId, creditAmount }) {
  if (!siteId) return
  const amount = Number(creditAmount)
  if (!Number.isFinite(amount) || amount <= 0) return

  const siteObjectId = toObjectId(siteId)
  const companyObjectId = toObjectId(companyId)

  const visits = await (() => {
    let q = SiteVisit.find({
      companyId: companyObjectId,
      siteId: siteObjectId,
      paymentStatus: { $ne: 'waived' },
    }).sort({ visitDate: 1 })
    if (session != null) q = q.session(session)
    return q.lean()
  })()

  let remaining = Math.round(amount * 100) / 100

  for (const visit of visits) {
    if (remaining <= 0) break
    const owed = owedAmount(visit)
    if (owed <= 0) continue

    const apply = Math.min(remaining, owed)
    const prevPaid = effectivePaidAmount(visit)
    const total = decAmount(visit.amount)
    const newPaid = Math.round((prevPaid + apply) * 100) / 100

    let newStatus
    let paidToStore
    if (newPaid >= total - 0.005) {
      newStatus = 'paid'
      paidToStore = Math.round(total * 100) / 100
    } else {
      newStatus = 'partial'
      paidToStore = newPaid
    }

    await SiteVisit.updateOne(
      { _id: visit._id },
      {
        $set: {
          paymentStatus: newStatus,
          paidAmount: mongoose.Types.Decimal128.fromString(paidToStore.toFixed(2)),
        },
      },
      session != null ? { session } : {},
    )

    remaining = Math.round((remaining - apply) * 100) / 100
  }
}

/**
 * Replay all ledger credits on a site (every coworker) against all visits on that site.
 * Shared instrument clients/sites use one visit pool; credits from any admin reduce pending.
 */
export async function recomputeVisitCreditsForSite(session, { companyId, siteId }) {
  if (!siteId) return

  const siteObjectId = toObjectId(siteId)
  const companyObjectId = toObjectId(companyId)

  const clearFilter = {
    companyId: companyObjectId,
    siteId: siteObjectId,
    paymentStatus: { $ne: 'waived' },
    paidAmount: { $exists: true, $ne: null },
  }
  const opts = session != null ? { session } : {}
  await SiteVisit.updateMany(clearFilter, { $unset: { paidAmount: '' }, $set: { paymentStatus: 'pending' } }, opts)

  let q = Transaction.find({
    companyId: companyObjectId,
    siteId: siteObjectId,
    type: 'credit',
  }).sort({ occurredOn: 1, _id: 1 })
  if (session != null) q = q.session(session)
  const credits = await q.lean()

  for (const tx of credits) {
    const creditAmount = decAmount(tx.amount)
    await applyCreditToSiteVisits(session, {
      companyId: companyObjectId,
      siteId: siteObjectId,
      creditAmount,
    })
  }
}

/** Replay credits for every site that has ledger credits on an instrument. */
export async function reconcileSiteCreditsForInstrument(companyId, instrumentId) {
  if (!instrumentId) return
  const companyObjectId = toObjectId(companyId)
  const instrumentObjectId = toObjectId(instrumentId)
  const siteIds = await Transaction.distinct('siteId', {
    companyId: companyObjectId,
    instrumentId: instrumentObjectId,
    type: 'credit',
    siteId: { $ne: null },
  })
  for (const siteId of siteIds) {
    await recomputeVisitCreditsForSite(null, { companyId: companyObjectId, siteId })
  }
}

/** @deprecated Use reconcileSiteCreditsForInstrument when instrument is known. */
export async function reconcileSiteCreditsForAdmin(companyId, adminId) {
  const companyObjectId = toObjectId(companyId)
  const siteIds = await Transaction.distinct('siteId', {
    companyId: companyObjectId,
    adminId: toObjectId(adminId),
    type: 'credit',
    siteId: { $ne: null },
  })
  for (const siteId of siteIds) {
    await recomputeVisitCreditsForSite(null, { companyId: companyObjectId, siteId })
  }
}
