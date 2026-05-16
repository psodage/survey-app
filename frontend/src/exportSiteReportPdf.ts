import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import invoiceLogo from './assets/logo.jpeg'
import { savePdf } from './utils/downloadFile'
import {
  formatPdfAmountCell,
  parsePdfAmount,
  PDF_AMOUNT_COL,
  PDF_MARGIN,
  PDF_TABLE_BASE_STYLES,
  PDF_TABLE_WIDTH,
} from './utils/pdfTableStyles'

export type SiteReportVisitRow = {
  id: string
  date: string
  machine: string
  paymentMode: string
  paymentStatus: string
  amount: string
  pendingAmount?: string
  work?: string
}

export type SiteReportPdfData = {
  client: string
  siteName: string
  location?: string
  status?: string
  lastVisit?: string
  year?: string
  filterNote?: string
  visits: SiteReportVisitRow[]
}

function formatReportFilenameDate(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
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

function pendingForRow(row: SiteReportVisitRow) {
  const p = row.pendingAmount?.trim()
  if (p) return parsePdfAmount(p)
  return parsePdfAmount(row.amount)
}

const SITE_REPORT_TABLE_COLS = {
  0: { cellWidth: 24 },
  1: { cellWidth: 22 },
  2: { cellWidth: 28 },
  3: { cellWidth: 24 },
  4: { cellWidth: 22 },
  5: { cellWidth: 30, ...PDF_AMOUNT_COL },
  6: { cellWidth: 32, ...PDF_AMOUNT_COL },
}

export async function exportSiteReportPdf(data: SiteReportPdfData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = PDF_MARGIN
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
  doc.text('Samarth Land Surveyors', marginX + 22, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(82, 82, 82)
  doc.text('Site Report', marginX + 22, 19)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(23, 23, 23)
  doc.text(`Site: ${data.siteName}`, marginX, startY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(82, 82, 82)
  let metaY = startY + 13
  doc.text(`Client: ${data.client}`, marginX, metaY)
  metaY += 5
  if (data.location) {
    doc.text(`Location: ${data.location}`, marginX, metaY)
    metaY += 5
  }
  if (data.status) {
    doc.text(`Status: ${data.status}`, marginX, metaY)
    metaY += 5
  }
  if (data.lastVisit) {
    doc.text(`Last visit: ${data.lastVisit}`, marginX, metaY)
    metaY += 5
  }
  const generated = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  doc.text(`Generated: ${generated}`, marginX, metaY)
  metaY += 5
  if (data.year) {
    doc.text(`Year: ${data.year}`, marginX, metaY)
    metaY += 5
  }
  if (data.filterNote) {
    doc.text(data.filterNote, marginX, metaY)
    metaY += 5
  }

  const totalVisits = data.visits.length
  const totalRevenue = data.visits.reduce((sum, r) => sum + parsePdfAmount(r.amount), 0)
  const totalPending = data.visits.reduce((sum, r) => sum + pendingForRow(r), 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(23, 23, 23)
  doc.text(`Total visits: ${totalVisits}`, marginX, metaY + 2)
  doc.text(`Total revenue (Rs): ${totalRevenue.toLocaleString('en-IN')}`, marginX + 70, metaY + 2)
  metaY += 6
  doc.setTextColor(190, 24, 93)
  doc.text(`Pending amount (Rs): ${totalPending.toLocaleString('en-IN')}`, marginX, metaY + 2)

  const tableStartY = metaY + 10
  const body =
    data.visits.length === 0
      ? [['—', '—', '—', '—', '—', '—', '—']]
      : data.visits.map((r) => [
          r.id,
          r.date,
          r.machine || '—',
          r.paymentMode || '—',
          r.paymentStatus || '—',
          formatPdfAmountCell(r.amount),
          formatPdfAmountCell(String(pendingForRow(r))),
        ])

  autoTable(doc, {
    startY: tableStartY,
    tableWidth: PDF_TABLE_WIDTH,
    head: [['Visit ID', 'Date', 'Machine', 'Payment', 'Status', 'Amount (Rs)', 'Pending (Rs)']],
    body,
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    styles: { ...PDF_TABLE_BASE_STYLES, fontSize: 8.5 },
    columnStyles: SITE_REPORT_TABLE_COLS,
    margin: { left: marginX, right: marginX },
    didDrawPage: (drawData) => {
      const pageH = doc.internal.pageSize.getHeight()
      const pageNum = doc.getCurrentPageInfo().pageNumber
      const total = doc.getNumberOfPages()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(`Page ${pageNum} of ${total}`, pageWidth - marginX, pageH - 8, { align: 'right' })
      if (drawData.cursor) {
        doc.setDrawColor(230, 230, 230)
        doc.line(marginX, pageH - 12, pageWidth - marginX, pageH - 12)
      }
    },
  })

  const safeSite = data.siteName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site'
  const filename = `Site_Report_${safeSite}_${formatReportFilenameDate()}.pdf`
  await savePdf(doc, filename)
}
