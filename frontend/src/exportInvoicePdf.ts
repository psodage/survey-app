import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import invoiceDefaultLogo from './assets/logo.jpeg'
import invoiceStamp from './assets/stamp.png'
import { fetchInvoiceBankColumns } from './invoiceBankColumns'
import { fetchInvoiceCompanyHeader, type InvoicePdfCompanyHeader } from './invoiceCompanyHeader'
import { savePdf } from './utils/downloadFile'
import { formatBillingLinesForDisplay } from './utils/formatBillingLines'
import { todayInvoiceDate } from './utils/invoiceDate'

export type InvoicePdfBankColumns = {
  left: { lines: string[] }
  right: { lines: string[] }
}

/** One row from site visit billing (qty×rate or flat amount). */
export type InvoicePdfBillingLine = {
  particular: string
  quantity?: number
  rate?: number
  amount?: number
}

export type InvoicePdfData = {
  client: string
  site: string
  /** Used for the default single line when `billingLines` is omitted */
  workType: string
  totalPoints: number
  ratePerPoint: number
  baseCharge: number
  extraCharges: number
  discount: number
  invoiceDate: string
  /** When set (e.g. SV-4006), invoice number becomes INV-4006 instead of random */
  visitId?: string
  /** Shown after "Status:" — affects colour (Paid = green, otherwise red) */
  paymentStatus?: string
  /** Optional: from GET /api/settings/invoice-bank-columns */
  bankColumns?: InvoicePdfBankColumns
  /** Optional: from GET /api/settings/invoice-company-header */
  companyHeader?: InvoicePdfCompanyHeader
  /** When set (from site visit), particulars table lists these rows */
  billingLines?: InvoicePdfBillingLine[]
  billingOtherCharges?: number
  /** When set, total reflects balance due (bill minus payments/credits). */
  pendingAmount?: number
}

function formatInr(value: number) {
  return `Rs ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function loadImageAsDataUrl(src: string) {
  const response = await fetch(src)
  const blob = await response.blob()
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Unable to read image: ${src}`))
    reader.readAsDataURL(blob)
  })
  return dataUrl
}

/** Invoice PDF always uses bundled `src/assets/logo.jpeg` (not company logo from DB). */
async function loadInvoicePdfLogoDataUrl(): Promise<string> {
  const src = typeof invoiceDefaultLogo === 'string' ? invoiceDefaultLogo : String(invoiceDefaultLogo)
  return loadImageAsDataUrl(src)
}

function buildInvoiceNumber(visitId?: string) {
  if (!visitId || visitId === '-') {
    return `INV-${String(Math.floor(1000 + Math.random() * 9000))}`
  }
  const digits = visitId.match(/(\d+)/)
  if (digits) return `INV-${digits[1]}`
  const tail = visitId.replace(/^SV-/i, '').replace(/[^A-Za-z0-9-]/g, '')
  return tail ? `INV-${tail}` : `INV-${String(Math.floor(1000 + Math.random() * 9000))}`
}

function statusFromPayment(raw?: string) {
  const s = (raw ?? '').trim().toLowerCase()
  const paid = s === 'paid' || (s.includes('paid') && !s.includes('unpaid') && !s.includes('pending'))
  return { label: paid ? 'Paid' : 'Unpaid', paid }
}

function buildInvoiceHeaderCompanyOpts(ch: InvoicePdfCompanyHeader | undefined) {
  return {
    companyName: (ch?.companyName ?? 'Samarth Land Surveyors').trim() || 'Samarth Land Surveyors',
    officeAddress: ch?.officeAddress ?? '',
    contactPhone: ch?.contactPhone ?? '',
    email: ch?.email ?? '',
    gstNumber: ch?.gstNumber ?? '',
  }
}

function dataUrlImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.includes('image/jpeg')) return 'JPEG'
  if (dataUrl.includes('image/webp')) return 'WEBP'
  return 'PNG'
}

function drawWatermark(
  doc: jsPDF,
  logoDataUrl: string,
  pageWidth: number,
  pageHeight: number,
) {
  const fmt = dataUrlImageFormat(logoDataUrl)
  const watermarkSize = 105
  const watermarkX = (pageWidth - watermarkSize) / 2
  const watermarkY = (pageHeight - watermarkSize) / 2 + 10
  const pdfDoc = doc as jsPDF & {
    GState?: new (options: { opacity?: number }) => unknown
    setGState?: (state: unknown) => void
  }
  if (pdfDoc.GState && pdfDoc.setGState) {
    pdfDoc.setGState(new pdfDoc.GState({ opacity: 0.08 }))
    doc.addImage(logoDataUrl, fmt, watermarkX, watermarkY, watermarkSize, watermarkSize)
    pdfDoc.setGState(new pdfDoc.GState({ opacity: 1 }))
  } else {
    doc.addImage(logoDataUrl, fmt, watermarkX, watermarkY, watermarkSize, watermarkSize)
  }
}

function drawInvoiceHeader(
  doc: jsPDF,
  logoDataUrl: string,
  opts: {
    title: string
    invoiceNo: string
    invoiceDate: string
    paymentStatus?: string
    companyName: string
    officeAddress: string
    contactPhone: string
    email: string
    gstNumber: string
  },
) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = 14
  const right = pageWidth - 14
  const logoLeft = left
  const logoTop = 9
  const logoSize = 32
  const textColX = logoLeft + logoSize + 5
  const textMaxW = right - textColX - 58
  const logoFmt = dataUrlImageFormat(logoDataUrl)

  doc.addImage(logoDataUrl, logoFmt, logoLeft, logoTop, logoSize, logoSize)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(30, 30, 30)
  doc.text(opts.title, textColX, logoTop + 6)

  let y = logoTop + 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(55, 55, 55)
  doc.text(opts.companyName.toUpperCase(), textColX, y, { maxWidth: textMaxW })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(90, 90, 90)
  if (opts.officeAddress.trim()) {
    doc.text(opts.officeAddress.trim(), textColX, y, { maxWidth: textMaxW })
    y += 5
  }
  if (opts.contactPhone.trim()) {
    doc.text(`Contact: ${opts.contactPhone.trim()}`, textColX, y, { maxWidth: textMaxW })
    y += 5
  }
  if (opts.email.trim()) {
    doc.text(`Email: ${opts.email.trim()}`, textColX, y, { maxWidth: textMaxW })
    y += 5
  }
  if (opts.gstNumber.trim()) {
    doc.text(`GST: ${opts.gstNumber.trim()}`, textColX, y, { maxWidth: textMaxW })
    y += 5
  }

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(35, 35, 35)
  doc.setFontSize(9.5)
  doc.text(`Invoice No: ${opts.invoiceNo}`, right, logoTop + 4, { align: 'right' })
  doc.text(`Invoice Date: ${opts.invoiceDate}`, right, logoTop + 10, { align: 'right' })

  const { label: statusLabel, paid } = statusFromPayment(opts.paymentStatus)
  const statusText = `Status: ${statusLabel}`
  const statusW = doc.getTextWidth(statusText)
  const badgePadX = 3
  const badgeW = statusW + badgePadX * 2
  const badgeH = 6.2
  const badgeX = right - badgeW
  const minRuleY = logoTop + logoSize + 4
  const ruleY = Math.max(minRuleY, y + 3)
  const badgeY = Math.min(logoTop + 11.2, ruleY - badgeH - 1)

  if (paid) {
    doc.setFillColor(230, 248, 230)
    doc.setDrawColor(120, 190, 120)
  } else {
    doc.setFillColor(255, 236, 236)
    doc.setDrawColor(230, 130, 130)
  }
  doc.setLineWidth(0.25)
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'FD')
  doc.setTextColor(...(paid ? ([21, 120, 21] as const) : ([190, 45, 45] as const)))
  doc.text(statusText, right - badgePadX, badgeY + 4.4, { align: 'right' })

  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  doc.line(left, ruleY, right, ruleY)
  return ruleY
}

function normalizeBankColumnLines(lines?: string[] | null): string[] {
  const trimmed = (lines ?? []).map((s) => String(s).trim()).filter(Boolean)
  return trimmed.length ? trimmed : ['—']
}

let cachedStampDataUrl: string | null = null

async function loadInvoiceStampDataUrl(): Promise<string | null> {
  if (cachedStampDataUrl) return cachedStampDataUrl
  try {
    const src = typeof invoiceStamp === 'string' ? invoiceStamp : String(invoiceStamp)
    cachedStampDataUrl = await loadImageAsDataUrl(src)
    return cachedStampDataUrl
  } catch {
    return null
  }
}

async function resolveInvoiceBankDrawModel(bc?: InvoicePdfBankColumns) {
  const leftLines = normalizeBankColumnLines(bc?.left?.lines)
  const rightLines = normalizeBankColumnLines(bc?.right?.lines)
  const stampDataUrl = await loadInvoiceStampDataUrl()
  return { leftLines, rightLines, stampDataUrl }
}

/** Match jspdf-autotable `grid` theme (defaultStyles lineColor + grid.table lineWidth) */
const INVOICE_TABLE_BORDER = { lineColor: 200 as const, lineWidth: 0.1 as const }

/** Bordered bank block + signatory space + footer, matching print layout */
function drawBankDetailsTable(
  doc: jsPDF,
  left: number,
  startY: number,
  pageWidth: number,
  right: number,
  cols: {
    leftLines: string[]
    rightLines: string[]
    stampDataUrl: string | null
  },
) {
  const tableW = right - left
  const halfW = tableW / 2
  const pad = { top: 3, right: 3, bottom: 3, left: 3 }
  const signatoryRowIndex = 2

  const body = [
    [
      {
        content: 'BANK DETAILS -',
        colSpan: 2,
        styles: {
          halign: 'center',
          valign: 'middle',
          fontStyle: 'bold',
          fontSize: 10.5,
          minCellHeight: 8,
        },
      },
    ],
    [
      { content: cols.leftLines.join('\n'), styles: { halign: 'left', cellWidth: halfW } },
      { content: cols.rightLines.join('\n'), styles: { halign: 'left', cellWidth: halfW } },
    ],
    [
      {
        content: 'Authorised Signatory',
        colSpan: 2,
        styles: {
          halign: 'right',
          valign: 'bottom',
          fontStyle: 'bold',
          fontSize: 9.5,
          minCellHeight: cols.stampDataUrl ? 32 : 22,
        },
      },
    ],
    [
      {
        content: 'THANK YOU...!',
        colSpan: 2,
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          fontSize: 10,
          minCellHeight: 8,
        },
      },
    ],
  ]

  autoTable(doc, {
    startY,
    tableWidth: tableW,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.6,
      textColor: [25, 25, 25],
      ...INVOICE_TABLE_BORDER,
      cellPadding: pad,
      valign: 'top',
    },
    body,
    margin: { left, right: pageWidth - right },
    columnStyles: {
      0: { cellWidth: halfW },
      1: { cellWidth: halfW },
    },
    didDrawCell: (data) => {
      if (!cols.stampDataUrl || data.section !== 'body') return
      if (data.row.index !== signatoryRowIndex || data.column.index !== 0) return
      const fmt = dataUrlImageFormat(cols.stampDataUrl)
      const imgW = 28
      const imgH = 28
      const labelW = doc.getTextWidth('Authorised Signatory')
      const stampX = right - labelW - imgW - 6
      const stampY = data.cell.y + 2
      doc.addImage(cols.stampDataUrl, fmt, stampX, stampY, imgW, imgH)
    },
  })

  return (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? startY + 1
}

/** Line-item table: widths in mm, total matches content width (A4 with 14 mm side margins) */
const INVOICE_LINE_TABLE_COL_STYLES = {
  0: { halign: 'center' as const, cellWidth: 14 },
  1: { cellWidth: 82 },
  2: { halign: 'right' as const, cellWidth: 24 },
  3: { halign: 'right' as const, cellWidth: 30 },
  4: { halign: 'right' as const, cellWidth: 32 },
}

function pdfLineTotal(row: InvoicePdfBillingLine): number {
  const q = row.quantity ?? 0
  const r = row.rate ?? 0
  if (q !== 0 && r !== 0) return q * r
  const a = Number(row.amount)
  return Number.isFinite(a) ? a : 0
}

export async function exportInvoicePdf(data: InvoicePdfData) {
  const useVisitBilling = Boolean(data.billingLines?.length)
  const billingLines = data.billingLines ?? []
  const billingOther = Math.max(0, Number(data.billingOtherCharges) || 0)

  let particularsSubtotal: number
  const lineItems: string[][] = []
  let sr = 1

  if (useVisitBilling) {
    if (data.baseCharge > 0) {
      lineItems.push([
        String(sr++),
        'Base Charges',
        '1',
        formatInr(data.baseCharge),
        formatInr(data.baseCharge),
      ])
    }
    for (const row of billingLines) {
      const lineAmt = pdfLineTotal(row)
      const label = (row.particular ?? '').trim()
      if (!label && lineAmt === 0) continue
      const q = row.quantity ?? 0
      const r = row.rate ?? 0
      const hasQtyRate = q !== 0 && r !== 0
      lineItems.push([
        String(sr++),
        label || '—',
        hasQtyRate ? String(q) : '—',
        hasQtyRate ? formatInr(r) : '—',
        formatInr(lineAmt),
      ])
    }
    if (billingOther > 0) {
      lineItems.push([String(sr++), 'Other charges', '1', formatInr(billingOther), formatInr(billingOther)])
    }
    const linesSum = billingLines.reduce((s, row) => s + pdfLineTotal(row), 0)
    particularsSubtotal = (data.baseCharge > 0 ? data.baseCharge : 0) + linesSum + billingOther
  } else {
    const pointsAmount = data.totalPoints * data.ratePerPoint
    particularsSubtotal = data.baseCharge + pointsAmount
    if (data.baseCharge > 0) {
      lineItems.push([
        String(sr++),
        'Base Charges',
        '1',
        formatInr(data.baseCharge),
        formatInr(data.baseCharge),
      ])
    }
    const workLabel = `${data.workType} Survey Work`
    lineItems.push([
      String(sr++),
      workLabel,
      String(data.totalPoints),
      formatInr(data.ratePerPoint),
      formatInr(pointsAmount),
    ])
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const invoiceNo = buildInvoiceNumber(data.visitId)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const left = 14
  const right = pageWidth - 14
  const companyHeader = data.companyHeader ?? (await fetchInvoiceCompanyHeader())
  const logoDataUrl = await loadInvoicePdfLogoDataUrl()
  const co = buildInvoiceHeaderCompanyOpts(companyHeader)

  drawWatermark(doc, logoDataUrl, pageWidth, pageHeight)
  const headerRuleY = drawInvoiceHeader(doc, logoDataUrl, {
    title: 'INVOICE',
    invoiceNo,
    invoiceDate: todayInvoiceDate(),
    paymentStatus: data.paymentStatus,
    ...co,
  })

  const billTop = headerRuleY + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(35, 35, 35)
  doc.text('Bill To', left, billTop)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(55, 55, 55)
  doc.text(`Client Name : ${data.client || '—'}`, left, billTop + 6)
  doc.text(`Site Name : ${data.site || '—'}`, left, billTop + 12)

  const tableStartY = billTop + 18

  const bodyRows = lineItems.length ? lineItems : [['1', '—', '—', formatInr(0), formatInr(0)]]
  autoTable(doc, {
    startY: tableStartY,
    tableWidth: right - left,
    head: [['Sr. No.', 'Particular', 'Quantity', 'Rate', 'Amount']],
    body: bodyRows,
    theme: 'grid',
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    styles: {
      fontSize: 9.2,
      cellPadding: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
      overflow: 'linebreak',
      ...INVOICE_TABLE_BORDER,
    },
    columnStyles: INVOICE_LINE_TABLE_COL_STYLES,
    margin: { left, right: pageWidth - right },
  })

  const summaryY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 130
  const labelX = right - 62
  const valueX = right

  const fullGrand = Math.max(0, particularsSubtotal + data.extraCharges - data.discount)
  let grandTotal = fullGrand
  let receivedDeduction = 0
  if (data.pendingAmount != null && Number.isFinite(data.pendingAmount) && data.pendingAmount >= 0) {
    grandTotal = Math.min(data.pendingAmount, fullGrand)
    receivedDeduction = fullGrand - grandTotal
  }
  const showReceivedLine = receivedDeduction > 0.005

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(55, 55, 55)
  doc.setFontSize(9.5)
  let y = summaryY + 9
  doc.text('Subtotal (Particulars)', labelX, y)
  doc.text(formatInr(particularsSubtotal), valueX, y, { align: 'right' })
  y += 6
  doc.text('Other Charges', labelX, y)
  doc.text(formatInr(data.extraCharges), valueX, y, { align: 'right' })
  y += 6
  if (data.discount > 0) {
    doc.text('Discount', labelX, y)
    doc.text(`- ${formatInr(data.discount)}`, valueX, y, { align: 'right' })
    y += 6
  }
  if (showReceivedLine) {
    doc.text('Payments / credits received', labelX, y)
    doc.text(`- ${formatInr(receivedDeduction)}`, valueX, y, { align: 'right' })
    y += 6
  }
  const lineY = y + 3
  doc.setDrawColor(210, 210, 210)
  doc.line(labelX, lineY, valueX, lineY)
  const totalTextY = lineY + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(30, 30, 30)
  doc.text('Total Amount', labelX, totalTextY)
  doc.text(formatInr(grandTotal), valueX, totalTextY, { align: 'right' })

  const notesY = totalTextY + 16
  const bankColumns = data.bankColumns ?? (await fetchInvoiceBankColumns())
  const bankDraw = await resolveInvoiceBankDrawModel(bankColumns)
  drawBankDetailsTable(doc, left, notesY, pageWidth, right, bankDraw)

  const safeClient = (data.client || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const safeDate = new Date().toISOString().slice(0, 10)
  await savePdf(doc, `invoice-${safeClient}-${safeDate}.pdf`)
}

export type CombinedVisitLine = {
  visitId: string
  visitNo?: number | string
  date: string
  machine: string
  amount: number
  notes?: string
  work?: string
  billingLines?: InvoicePdfBillingLine[]
}

const COMBINED_INVOICE_COL_STYLES = {
  0: { halign: 'center' as const, cellWidth: 14 },
  1: { cellWidth: 58 },
  2: { cellWidth: 88 },
  3: { halign: 'right' as const, cellWidth: 32 },
}

function combinedSiteCellText(v: CombinedVisitLine): string {
  const visitNo =
    v.visitNo != null && String(v.visitNo).trim() !== ''
      ? String(v.visitNo)
      : v.visitId.replace(/^SV-/i, '')
  return `Site Visit No: ${visitNo}\nDate: ${v.date}`
}

function combinedParticularCellText(v: CombinedVisitLine): string {
  const fromLines = formatBillingLinesForDisplay(v.billingLines, '')
  if (fromLines) return fromLines
  const work = (v.work ?? v.machine ?? '').trim()
  return work || '—'
}

export async function exportCombinedSiteInvoicePdf(data: {
  client: string
  site: string
  location?: string
  invoiceDate: string
  visits: CombinedVisitLine[]
  bankColumns?: InvoicePdfBankColumns
  companyHeader?: InvoicePdfCompanyHeader
}) {
  const visits = data.visits.filter((v) => v.amount > 0)
  const total = visits.reduce((sum, v) => sum + v.amount, 0)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const invoiceNo = buildInvoiceNumber()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const left = 14
  const right = pageWidth - 14
  const companyHeader = data.companyHeader ?? (await fetchInvoiceCompanyHeader())
  const logoDataUrl = await loadInvoicePdfLogoDataUrl()
  const co = buildInvoiceHeaderCompanyOpts(companyHeader)

  drawWatermark(doc, logoDataUrl, pageWidth, pageHeight)
  const headerRuleY = drawInvoiceHeader(doc, logoDataUrl, {
    title: 'INVOICE (COMBINED)',
    invoiceNo,
    invoiceDate: todayInvoiceDate(),
    paymentStatus: 'Unpaid',
    ...co,
  })

  const billTop = headerRuleY + 8
  const siteLine = [data.site || 'Site', data.location].filter(Boolean).join(' — ')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(35, 35, 35)
  doc.text('Bill To', left, billTop)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(55, 55, 55)
  doc.text(`Client Name : ${data.client || '—'}`, left, billTop + 6)
  doc.text(`Site Name : ${siteLine}`, left, billTop + 12)
  doc.setFontSize(8.8)
  doc.setTextColor(100, 100, 100)
  doc.text('This invoice covers all listed site visits for the above site.', left, billTop + 18)

  const tableBody = visits.map((v, i) => [
    String(i + 1),
    combinedSiteCellText(v),
    combinedParticularCellText(v),
    formatInr(v.amount),
  ])

  autoTable(doc, {
    startY: billTop + 23,
    tableWidth: right - left,
    head: [['Sr. No.', 'Site', 'Particular', 'Amount']],
    body: tableBody.length ? tableBody : [['-', 'No billable visits', '—', formatInr(0)]],
    theme: 'grid',
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    styles: {
      fontSize: 9.2,
      cellPadding: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
      overflow: 'linebreak',
      ...INVOICE_TABLE_BORDER,
    },
    columnStyles: COMBINED_INVOICE_COL_STYLES,
    margin: { left, right: pageWidth - right },
  })

  const summaryY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 130
  const labelX = right - 62
  const valueX = right

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(55, 55, 55)
  doc.setFontSize(9.5)
  doc.text('Subtotal (Particulars)', labelX, summaryY + 9)
  doc.text(formatInr(total), valueX, summaryY + 9, { align: 'right' })
  doc.text('Other Charges', labelX, summaryY + 15)
  doc.text(formatInr(0), valueX, summaryY + 15, { align: 'right' })
  doc.setDrawColor(210, 210, 210)
  doc.line(labelX, summaryY + 18, valueX, summaryY + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(30, 30, 30)
  doc.text('Total Amount', labelX, summaryY + 25)
  doc.text(formatInr(total), valueX, summaryY + 25, { align: 'right' })

  const notesY = summaryY + 36
  const bankColumns = data.bankColumns ?? (await fetchInvoiceBankColumns())
  const bankDraw = await resolveInvoiceBankDrawModel(bankColumns)
  drawBankDetailsTable(doc, left, notesY, pageWidth, right, bankDraw)

  const safeClient = (data.client || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const safeDate = new Date().toISOString().slice(0, 10)
  await savePdf(doc, `invoice-combined-${safeClient}-${safeDate}.pdf`)
}
