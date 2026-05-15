import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import invoiceLogo from './assets/logo.jpeg'
import { savePdf } from './utils/downloadFile'

export type PdfTransaction = {
  type: 'debit' | 'credit'
  amount: number
  date: string
  reason?: string
  client?: string
  site?: string
}

export type ExportAccountManagerReportPdfOpts = {
  accountManagerName: string
  companyName?: string
  year: string
  transactions: PdfTransaction[]
  totalDebit: number
  totalCredit: number
  netBalance: number
  pendingAmount: number
}

function formatReportFilenameDate(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function formatPdfINR(value: number) {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function formatPdfDisplayDate(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function loadImageAsDataUrl(src: string) {
  const response = await fetch(src)
  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to load logo'))
    reader.readAsDataURL(blob)
  })
}

function reasonOrClient(tx: PdfTransaction) {
  if (tx.type === 'debit') return (tx.reason ?? '').trim() || '—'
  return (tx.client ?? '').trim() || '—'
}

function siteCell(tx: PdfTransaction) {
  if (tx.type === 'credit') return (tx.site ?? '').trim() || '—'
  return '—'
}

/**
 * Account Manager ledger PDF — desktop, mobile browser, and installed PWA (blob download).
 */
export async function exportAccountManagerReportPdf(opts: ExportAccountManagerReportPdfOpts) {
  const {
    accountManagerName,
    companyName = 'Samarth Land Surveyors',
    year,
    transactions,
    totalDebit,
    totalCredit,
    netBalance,
    pendingAmount,
  } = opts

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const marginX = 14
  let startY = 16

  try {
    const logoDataUrl = await loadImageAsDataUrl(
      typeof invoiceLogo === 'string' ? invoiceLogo : String(invoiceLogo),
    )
    doc.addImage(logoDataUrl, 'JPEG', marginX, 10, 18, 18)
    startY = 22
  } catch {
    startY = 16
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(23, 23, 23)
  doc.text(companyName, marginX + 22, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(82, 82, 82)
  doc.text('Account Manager Report', marginX + 22, 19)

  const exportedOn = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(23, 23, 23)
  doc.text(accountManagerName.trim() || 'Account Manager', marginX, startY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(82, 82, 82)
  doc.text(`Year: ${year}`, marginX, startY + 12)
  doc.text(`Exported: ${exportedOn}`, marginX, startY + 17)

  const summaryY = startY + 24
  doc.setFontSize(10)
  doc.setTextColor(23, 23, 23)
  const summaryLines = [
    `Total Debit (Rs): ${formatPdfINR(totalDebit)}`,
    `Total Credit (Rs): ${formatPdfINR(totalCredit)}`,
    `Net Balance (Rs): ${formatPdfINR(netBalance)}`,
    `Pending Amount (Rs): ${formatPdfINR(pendingAmount)}`,
  ]
  summaryLines.forEach((line, i) => {
    doc.text(line, marginX, summaryY + i * 5)
  })

  const body =
    transactions.length === 0
      ? [['—', '—', 'No transactions for the selected period', '—', '—']]
      : transactions.map((tx) => [
          tx.type === 'debit' ? 'Debit' : 'Credit',
          formatPdfINR(tx.amount),
          reasonOrClient(tx),
          siteCell(tx),
          formatPdfDisplayDate(tx.date),
        ])

  autoTable(doc, {
    startY: summaryY + summaryLines.length * 5 + 4,
    head: [['Type', 'Amount (Rs)', 'Reason / Client', 'Site', 'Date']],
    body,
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 1.5, overflow: 'linebreak' },
    columnStyles: {
      1: { halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  })

  const filename = `Account_Manager_Report_${formatReportFilenameDate()}.pdf`
  await savePdf(doc, filename)
}

/** @deprecated Use exportAccountManagerReportPdf */
export async function exportFilteredTransactionsPdf(opts: {
  year: string
  transactions: PdfTransaction[]
  totalDebit: number
  totalCredit: number
  netBalance: number
  accountManagerName?: string
  pendingAmount?: number
  companyName?: string
}) {
  await exportAccountManagerReportPdf({
    accountManagerName: opts.accountManagerName?.trim() || 'Account Manager',
    companyName: opts.companyName,
    year: opts.year,
    transactions: opts.transactions,
    totalDebit: opts.totalDebit,
    totalCredit: opts.totalCredit,
    netBalance: opts.netBalance,
    pendingAmount: opts.pendingAmount ?? 0,
  })
}
