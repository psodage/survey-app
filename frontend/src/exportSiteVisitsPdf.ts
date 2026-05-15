import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import invoiceLogo from './assets/logo.jpeg'
import { savePdf } from './utils/downloadFile'

export type SiteVisitExportRow = {
  id: string
  client: string
  site: string
  date: string
  amount: string
  paymentStatus: string
  machine: string
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

function parseAmountDisplay(amount: string) {
  const n = Number(String(amount).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function formatPdfAmount(amount: string) {
  return parseAmountDisplay(amount).toLocaleString('en-IN')
}

export type ExportSiteVisitsPdfOpts = {
  year?: string
  /** Shown under title when list is filtered (search / pay status). */
  filterNote?: string
}

export async function exportSiteVisitsPdf(rows: SiteVisitExportRow[], opts: ExportSiteVisitsPdfOpts = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
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
  doc.text('Samarth Land Surveyors', marginX + 22, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(82, 82, 82)
  doc.text('Site Visits Report', marginX + 22, 19)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(23, 23, 23)
  doc.text('Site Visits', marginX, startY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(82, 82, 82)
  const generated = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  doc.text(`Export date: ${generated}`, marginX, startY + 13)
  if (opts.year) {
    doc.text(`Year: ${opts.year}`, marginX, startY + 18)
  }
  if (opts.filterNote) {
    doc.text(opts.filterNote, marginX, startY + (opts.year ? 23 : 18))
  }
  const tableStartY = startY + (opts.filterNote ? (opts.year ? 28 : 23) : opts.year ? 23 : 18)

  const body =
    rows.length === 0
      ? [['—', '—', '—', '—', '—', '—', '—']]
      : rows.map((r) => [
          r.id,
          r.client,
          r.site,
          r.date,
          formatPdfAmount(r.amount),
          r.paymentStatus,
          r.machine || '—',
        ])

  autoTable(doc, {
    startY: tableStartY,
    head: [['Visit ID', 'Client', 'Site', 'Date', 'Amount (Rs)', 'Status', 'Machine']],
    body,
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 22 },
      4: { halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
    didDrawPage: (data) => {
      const pageH = doc.internal.pageSize.getHeight()
      const pageNum = doc.getCurrentPageInfo().pageNumber
      const total = doc.getNumberOfPages()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(`Page ${pageNum} of ${total}`, pageWidth - marginX, pageH - 8, { align: 'right' })
      if (data.cursor) {
        doc.setDrawColor(230, 230, 230)
        doc.line(marginX, pageH - 12, pageWidth - marginX, pageH - 12)
      }
    },
  })

  const filename = `Site_Visits_Report_${formatReportFilenameDate()}.pdf`
  await savePdf(doc, filename)
}
