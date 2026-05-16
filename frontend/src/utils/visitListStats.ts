export type VisitAmountRecord = {
  amount: string
  paymentStatus: string
  pendingAmount?: string
}

export function parseVisitListAmount(amount: string) {
  return Number(String(amount).replace(/[^\d.-]/g, '')) || 0
}

export function visitOwedAmount(record: VisitAmountRecord) {
  const pending = record.pendingAmount?.trim()
  if (pending) return parseVisitListAmount(pending)
  const bill = parseVisitListAmount(record.amount)
  if (record.paymentStatus === 'Paid') return 0
  if (record.paymentStatus === 'Waived') return 0
  if (record.paymentStatus === 'Partial') return bill * 0.5
  return bill
}

export function computeVisitListStats(records: VisitAmountRecord[]) {
  let totalRevenue = 0
  let receivedAmount = 0
  let pendingAmount = 0

  for (const r of records) {
    const bill = parseVisitListAmount(r.amount)
    const owed = visitOwedAmount(r)
    totalRevenue += bill
    receivedAmount += Math.max(0, bill - owed)
    pendingAmount += owed
  }

  return {
    visitCount: records.length,
    totalRevenue,
    receivedAmount,
    pendingAmount,
  }
}
