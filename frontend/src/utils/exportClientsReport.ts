import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { downloadCsv, savePdf } from './downloadFile'
import {
  formatPdfAmountCell,
  PDF_AMOUNT_COL,
  PDF_MARGIN,
  PDF_TABLE_BASE_STYLES,
  PDF_TABLE_WIDTH,
} from './pdfTableStyles'

export type ClientExportRow = {
  name: string
  phone: string
  sites: number
  revenue: string
  received: string
  pending: string
}

export type SiteExportRow = {
  name: string
  location: string
  lastVisit: string
  status: string
  pending: string
}

export type ClientVisitExportRow = {
  id: string
  visitNo?: number
  date: string
  site: string
  machine: string
  paymentMode: string
  paymentStatus: string
  amount: string
}

export type ClientCreditExportRow = {
  date: string
  site: string
  amount: string
  paymentMode: string
  receivedBy: string
  notes?: string
}

export type ClientReportExportData = {
  client: ClientExportRow
  sites: SiteExportRow[]
  visits?: ClientVisitExportRow[]
  credits?: ClientCreditExportRow[]
  totals?: {
    revenue: number
    received: number
    creditTotal: number
    pending: number
  }
}

function escapeCsvCell(value: string | number) {
  const t = String(value).replace(/"/g, '""')
  if (/[",\n\r]/.test(t)) return `"${t}"`
  return t
}

function rowsToCsv(headers: string[], rows: (string | number)[][]) {
  const lines = [headers.map(escapeCsvCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','))
  }
  return lines.join('\n')
}

function formatInrPlain(n: number) {
  return `Rs ${Math.round(n).toLocaleString('en-IN')}`
}

const CLIENT_ALL_TABLE_COLS = {
  0: { cellWidth: 44 },
  1: { cellWidth: 32 },
  2: { cellWidth: 22, halign: 'right' as const },
  3: { cellWidth: 42, ...PDF_AMOUNT_COL },
  4: { cellWidth: 42, ...PDF_AMOUNT_COL },
}

const CLIENT_SITE_TABLE_COLS = {
  0: { cellWidth: 36 },
  1: { cellWidth: 42 },
  2: { cellWidth: 28 },
  3: { cellWidth: 22 },
  4: { cellWidth: 54, ...PDF_AMOUNT_COL },
}

const CLIENT_VISIT_TABLE_COLS = {
  0: { cellWidth: 26 },
  1: { cellWidth: 14 },
  2: { cellWidth: 24 },
  3: { cellWidth: 32 },
  4: { cellWidth: 28 },
  5: { cellWidth: 20 },
  6: { cellWidth: 38, ...PDF_AMOUNT_COL },
}

const CLIENT_CREDIT_TABLE_COLS = {
  0: { cellWidth: 22 },
  1: { cellWidth: 30 },
  2: { cellWidth: 26, ...PDF_AMOUNT_COL },
  3: { cellWidth: 28 },
  4: { cellWidth: 32 },
  5: { cellWidth: 44 },
}

export async function exportAllClientsPdf(clients: ClientExportRow[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFontSize(16)
  doc.setTextColor(23, 23, 23)
  doc.text('All Clients Report', 14, 16)
  doc.setFontSize(10)
  doc.setTextColor(82, 82, 82)
  doc.text(`Total Clients: ${clients.length}`, 14, 23)
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
    14,
    28,
  )
  const body =
    clients.length === 0
      ? [['—', '—', '—', '—', 'No clients found']]
      : clients.map((c) => [
          c.name,
          c.phone,
          String(c.sites),
          formatPdfAmountCell(c.received),
          formatPdfAmountCell(c.pending),
        ])
  autoTable(doc, {
    startY: 34,
    tableWidth: PDF_TABLE_WIDTH,
    head: [['Client Name', 'Phone', 'Total Sites', 'Received (Rs)', 'Pending (Rs)']],
    body,
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    styles: PDF_TABLE_BASE_STYLES,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    columnStyles: CLIENT_ALL_TABLE_COLS,
  })
  const safeDate = new Date().toISOString().slice(0, 10)
  await savePdf(doc, `all-clients-report-${safeDate}.pdf`)
}

export async function exportAllClientsExcel(clients: ClientExportRow[]) {
  const csv = rowsToCsv(
    ['Client Name', 'Phone', 'Total Sites', 'Revenue', 'Received', 'Pending'],
    clients.map((c) => [c.name, c.phone, c.sites, c.revenue, c.received, c.pending]),
  )
  const safeDate = new Date().toISOString().slice(0, 10)
  await downloadCsv(csv, `all-clients-report-${safeDate}.csv`)
}

export async function exportClientPdf(data: ClientReportExportData) {
  const { client, sites, visits = [], credits = [], totals } = data
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = 16

  doc.setFontSize(16)
  doc.setTextColor(23, 23, 23)
  doc.text(`Client Report: ${client.name}`, 14, y)
  y += 10
  doc.setFontSize(10)
  doc.setTextColor(82, 82, 82)
  doc.text(`Phone: ${client.phone}`, 14, y)
  y += 5
  doc.text(`Total Sites: ${client.sites}`, 14, y)
  y += 5
  doc.text(`Total Revenue: ${client.revenue}`, 14, y)
  doc.text(`Received: ${client.received}`, 105, y)
  y += 5
  doc.text(`Pending: ${client.pending}`, 14, y)
  if (totals) {
    doc.text(`Credits (transactions): ${formatInrPlain(totals.creditTotal)}`, 105, y)
  }
  y += 5
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
    14,
    y,
  )
  y += 8

  doc.setFontSize(11)
  doc.setTextColor(35, 35, 35)
  doc.text('Sites', 14, y)
  y += 2

  const siteBody =
    sites.length === 0
      ? [['—', '—', '—', 'No sites found', '—']]
      : sites.map((s) => [
          s.name,
          s.location,
          s.lastVisit,
          s.status,
          formatPdfAmountCell(s.pending),
        ])

  autoTable(doc, {
    startY: y,
    tableWidth: PDF_TABLE_WIDTH,
    head: [['Site Name', 'Location', 'Last Visit', 'Status', 'Pending (Rs)']],
    body: siteBody,
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    styles: PDF_TABLE_BASE_STYLES,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    columnStyles: CLIENT_SITE_TABLE_COLS,
  })

  y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 10

  doc.setFontSize(11)
  doc.text('Site Visits', 14, y)
  y += 2

  const visitBody =
    visits.length === 0
      ? [['—', '—', '—', '—', '—', '—', 'No visits']]
      : visits.map((v) => [
          v.id,
          v.visitNo != null ? String(v.visitNo) : '—',
          v.date,
          v.site,
          v.machine,
          v.paymentStatus,
          formatPdfAmountCell(v.amount),
        ])

  autoTable(doc, {
    startY: y,
    tableWidth: PDF_TABLE_WIDTH,
    head: [['Visit ID', 'Visit No.', 'Date', 'Site', 'Machine', 'Status', 'Amount (Rs)']],
    body: visitBody,
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    styles: { ...PDF_TABLE_BASE_STYLES, fontSize: 8 },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    columnStyles: CLIENT_VISIT_TABLE_COLS,
  })

  y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 10

  if (y > 250) {
    doc.addPage()
    y = 16
  }

  doc.setFontSize(11)
  doc.text('Client Credit Transactions', 14, y)
  y += 2

  const creditBody =
    credits.length === 0
      ? [['—', '—', '—', '—', '—', 'No credit transactions']]
      : credits.map((c) => [
          c.date,
          c.site,
          formatPdfAmountCell(c.amount),
          c.paymentMode,
          c.receivedBy,
          c.notes || '—',
        ])

  autoTable(doc, {
    startY: y,
    tableWidth: PDF_TABLE_WIDTH,
    head: [['Date', 'Site', 'Amount (Rs)', 'Payment Mode', 'Received By', 'Notes']],
    body: creditBody,
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    styles: { ...PDF_TABLE_BASE_STYLES, fontSize: 8 },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    columnStyles: CLIENT_CREDIT_TABLE_COLS,
  })

  y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 12

  if (totals) {
    doc.setFontSize(10)
    doc.setTextColor(55, 55, 55)
    doc.text(`Total revenue: ${formatInrPlain(totals.revenue)}`, 14, y)
    y += 5
    doc.text(`Total received / credits: ${formatInrPlain(totals.received)}`, 14, y)
    y += 5
    doc.text(`Credit transactions total: ${formatInrPlain(totals.creditTotal)}`, 14, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text(`Pending amount: ${formatInrPlain(totals.pending)}`, 14, y)
  }

  const safeName = client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const safeDate = new Date().toISOString().slice(0, 10)
  await savePdf(doc, `client-report-${safeName || 'client'}-${safeDate}.pdf`)
}

export async function exportClientExcel(data: ClientReportExportData) {
  const { client, sites, visits = [], credits = [] } = data
  const sections: string[] = []

  sections.push(
    rowsToCsv(
      ['Client', 'Phone', 'Sites', 'Revenue', 'Received', 'Pending'],
      [[client.name, client.phone, client.sites, client.revenue, client.received, client.pending]],
    ),
  )
  sections.push('')
  sections.push(
    rowsToCsv(
      ['Site Name', 'Location', 'Last Visit', 'Status', 'Pending'],
      sites.length
        ? sites.map((s) => [s.name, s.location, s.lastVisit, s.status, s.pending])
        : [['—', '—', '—', '—', 'No sites']],
    ),
  )
  sections.push('')
  sections.push(
    rowsToCsv(
      ['Visit ID', 'Visit No.', 'Date', 'Site', 'Machine', 'Status', 'Amount'],
      visits.length
        ? visits.map((v) => [v.id, v.visitNo ?? '', v.date, v.site, v.machine, v.paymentStatus, v.amount])
        : [['—', '—', '—', '—', '—', '—', 'No visits']],
    ),
  )
  sections.push('')
  sections.push(
    rowsToCsv(
      ['Date', 'Site', 'Amount', 'Payment Mode', 'Received By', 'Notes'],
      credits.length
        ? credits.map((c) => [c.date, c.site, c.amount, c.paymentMode, c.receivedBy, c.notes ?? ''])
        : [['—', '—', '—', '—', '—', 'No credits']],
    ),
  )

  const safeName = client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const safeDate = new Date().toISOString().slice(0, 10)
  await downloadCsv(sections.join('\n'), `client-report-${safeName || 'client'}-${safeDate}.csv`)
}
