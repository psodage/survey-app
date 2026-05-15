import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { downloadCsv, savePdf } from './downloadFile'

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
      : clients.map((c) => [c.name, c.phone, String(c.sites), c.received, c.pending])
  autoTable(doc, {
    startY: 34,
    head: [['Client Name', 'Phone', 'Total Sites', 'Received (Rs)', 'Pending (Rs)']],
    body,
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { left: 14, right: 14 },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
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

export async function exportClientPdf(client: ClientExportRow, sites: SiteExportRow[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setFontSize(16)
  doc.setTextColor(23, 23, 23)
  doc.text(`Client Report: ${client.name}`, 14, 16)
  doc.setFontSize(10)
  doc.setTextColor(82, 82, 82)
  doc.text(`Phone: ${client.phone}`, 14, 23)
  doc.text(`Total Sites: ${client.sites}`, 14, 28)
  doc.text(`Total Revenue: ${client.revenue}`, 78, 28)
  doc.text(`Received: ${client.received}`, 14, 33)
  doc.text(`Pending: ${client.pending}`, 78, 33)
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
    14,
    38,
  )
  const body =
    sites.length === 0
      ? [['—', '—', '—', 'No sites found', '—']]
      : sites.map((s) => [s.name, s.location, s.lastVisit, s.status, s.pending])
  autoTable(doc, {
    startY: 44,
    head: [['Site Name', 'Location', 'Last Visit', 'Status', 'Pending (Rs)']],
    body,
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { left: 14, right: 14 },
    columnStyles: { 4: { halign: 'right' } },
  })
  const safeName = client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const safeDate = new Date().toISOString().slice(0, 10)
  await savePdf(doc, `client-report-${safeName || 'client'}-${safeDate}.pdf`)
}

export async function exportClientExcel(client: ClientExportRow, sites: SiteExportRow[]) {
  const csv = rowsToCsv(
    ['Site Name', 'Location', 'Last Visit', 'Status', 'Pending'],
    sites.length
      ? sites.map((s) => [s.name, s.location, s.lastVisit, s.status, s.pending])
      : [['—', '—', '—', '—', 'No sites']],
  )
  const safeName = client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const safeDate = new Date().toISOString().slice(0, 10)
  await downloadCsv(csv, `client-sites-${safeName || 'client'}-${safeDate}.csv`)
}
