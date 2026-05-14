import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type PdfTransaction = {
  type: 'debit' | 'credit'
  amount: number
  date: string
  reason?: string
  client?: string
  site?: string
}

function formatPdfINR(value: number) {
  return value.toLocaleString('en-IN')
}

export function exportFilteredTransactionsPdf(opts: {
  year: string
  transactions: PdfTransaction[]
  totalDebit: number
  totalCredit: number
  netBalance: number
}) {
  const { year, transactions, totalDebit, totalCredit, netBalance } = opts
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFontSize(16)
  doc.setTextColor(23, 23, 23)
  doc.text('Account transactions', 14, 16)
  doc.setFontSize(10)
  doc.setTextColor(82, 82, 82)
  doc.text(`Filtered by year: ${year}`, 14, 23)
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
    14,
    28,
  )

  const body =
    transactions.length === 0
      ? [['—', '—', 'No transactions for the current filter', '—', '—']]
      : transactions.map((tx) => [
          tx.type === 'debit' ? 'Debit' : 'Credit',
          formatPdfINR(tx.amount),
          tx.type === 'debit' ? (tx.reason ?? '') : (tx.client ?? ''),
          tx.type === 'credit' ? (tx.site ?? '') : '—',
          tx.date,
        ])

  const foot = [
    ['Total debit (Rs)', formatPdfINR(totalDebit), '', '', ''],
    ['Total credit (Rs)', formatPdfINR(totalCredit), '', '', ''],
    ['Net balance (Rs)', formatPdfINR(netBalance), '', '', ''],
  ]

  autoTable(doc, {
    startY: 34,
    head: [['Type', 'Amount (Rs)', 'Reason / client', 'Site', 'Date']],
    body,
    foot,
    showFoot: 'lastPage',
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [245, 245, 245], textColor: 23, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 1.5, overflow: 'linebreak' },
    columnStyles: {
      1: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  })

  const safeDate = new Date().toISOString().slice(0, 10)
  doc.save(`transactions-${year}-${safeDate}.pdf`)
}
