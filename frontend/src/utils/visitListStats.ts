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
  return parseVisitListAmount(record.amount)
}

export function computeVisitListStats(records: VisitAmountRecord[]) {
  let totalRevenue = 0
  let receivedAmount = 0
  let pendingAmount = 0

  for (const r of records) {
    const bill = parseVisitListAmount(r.amount)
    totalRevenue += bill
    if (r.paymentStatus === 'Paid') {
      receivedAmount += bill
    } else if (r.paymentStatus !== 'Waived') {
      pendingAmount += visitOwedAmount(r)
    }
  }

  return {
    visitCount: records.length,
    totalRevenue,
    receivedAmount,
    pendingAmount,
  }
}
