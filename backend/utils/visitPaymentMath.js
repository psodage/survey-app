/**
 * Shared rules for how much of a visit's bill counts as "received" for revenue/pending summaries.
 * When `paidAmount` is set (e.g. after a ledger credit), it is the source of truth (capped at visit amount).
 * Otherwise legacy behaviour: paid = full amount, partial = 50% of bill (historical heuristic).
 */

export function decAmount(v) {
  if (v == null || v === undefined) return 0
  try {
    return parseFloat(v.toString()) || 0
  } catch {
    return 0
  }
}

export function effectivePaidAmount(visit) {
  const total = decAmount(visit.amount)
  if (visit.paidAmount != null && visit.paidAmount !== undefined) {
    return Math.min(total, decAmount(visit.paidAmount))
  }
  if (visit.paymentStatus === 'paid') return total
  if (visit.paymentStatus === 'partial') return total * 0.5
  if (visit.paymentStatus === 'waived') return 0
  return 0
}

/** Rupees still collectable toward this visit (excludes waived). */
export function owedAmount(visit) {
  if (visit.paymentStatus === 'waived') return 0
  return Math.max(0, decAmount(visit.amount) - effectivePaidAmount(visit))
}
