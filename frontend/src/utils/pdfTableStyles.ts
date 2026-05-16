/** A4 portrait content width (mm) with 14 mm side margins */
export const PDF_MARGIN = 14
export const PDF_TABLE_WIDTH = 210 - PDF_MARGIN * 2

export const PDF_TABLE_BASE_STYLES = {
  font: 'helvetica',
  fontSize: 9,
  cellPadding: 2,
  overflow: 'linebreak' as const,
}

/** Right-aligned amount / currency cells — consistent size on every page */
export const PDF_AMOUNT_COL = {
  halign: 'right' as const,
  fontStyle: 'normal' as const,
}

export function parsePdfAmount(amount: string) {
  const n = Number(String(amount).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function formatPdfAmountCell(amount: string | number) {
  if (typeof amount === 'number') {
    return Number.isFinite(amount) ? amount.toLocaleString('en-IN') : '—'
  }
  const raw = String(amount).trim()
  if (!raw || raw === '—') return '—'
  const n = parsePdfAmount(raw)
  if (!/\d/.test(raw)) return raw
  return n.toLocaleString('en-IN')
}
