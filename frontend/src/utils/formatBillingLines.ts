export type BillingLineDisplay = {
  particular?: string
  quantity?: number
  rate?: number
  amount?: number
}

/** Format billing lines as "Particular - Qty: N" (one per line). */
export function formatBillingLinesForDisplay(lines?: BillingLineDisplay[] | null, fallback = '—'): string {
  if (!lines?.length) return fallback
  const rows = lines
    .map((row) => {
      const label = (row.particular ?? '').trim()
      const q = row.quantity ?? 0
      if (!label && q === 0) {
        const flat = Number(row.amount)
        if (Number.isFinite(flat) && flat !== 0) return `— - Qty: 1`
        return ''
      }
      if (q !== 0) return `${label || '—'} - Qty: ${q}`
      return label || '—'
    })
    .filter(Boolean)
  return rows.length ? rows.join('\n') : fallback
}
