import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import invoiceLogo from './assets/logo.jpeg'

export type InvoicePdfData = {
  client: string
  site: string
  workType: string
  totalPoints: number
  ratePerPoint: number
  baseCharge: number
  extraCharges: number
  discount: number
  invoiceDate: string
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

export async function exportInvoicePdf(data: InvoicePdfData) {
  const pointsAmount = data.totalPoints * data.ratePerPoint
  const subtotal = data.baseCharge + pointsAmount + data.extraCharges
  const total = Math.max(0, subtotal - data.discount)
  const totalTaxPercent = 0
  const taxAmount = (total * totalTaxPercent) / 100
  const grandTotal = total + taxAmount

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const invoiceNo = `INV-${String(Math.floor(1000 + Math.random() * 9000))}`
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const left = 14
  const right = pageWidth - 14
  const logoDataUrl = await loadImageAsDataUrl(invoiceLogo)

  const watermarkSize = 105
  const watermarkX = (pageWidth - watermarkSize) / 2
  const watermarkY = (pageHeight - watermarkSize) / 2 + 10
  const pdfDoc = doc as jsPDF & {
    GState?: new (options: { opacity?: number }) => unknown
    setGState?: (state: unknown) => void
  }

  if (pdfDoc.GState && pdfDoc.setGState) {
    pdfDoc.setGState(new pdfDoc.GState({ opacity: 0.08 }))
    doc.addImage(logoDataUrl, 'JPEG', watermarkX, watermarkY, watermarkSize, watermarkSize)
    pdfDoc.setGState(new pdfDoc.GState({ opacity: 1 }))
  } else {
    doc.addImage(logoDataUrl, 'JPEG', watermarkX, watermarkY, watermarkSize, watermarkSize)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(30, 30, 30)
  doc.text('INVOICE', left + 42, 20)
  doc.addImage(logoDataUrl, 'JPEG', left, 8, 34, 34)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text('SAMARTH LAND SURVEYORS', left, 24)
  doc.text('Bhoinagar Shahapur, Ichalkaranji', left, 28.5)
  doc.text('Contact: +91 8643001010 / +91 7026016077', left, 33)
  doc.text('Email: samarthlandsurveyors@gmail.com', left, 37.5)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(35, 35, 35)
  doc.setFontSize(9.5)
  doc.text(`Invoice No: ${invoiceNo}`, right, 20, { align: 'right' })
  doc.text(`Invoice Date: ${data.invoiceDate}`, right, 25.5, { align: 'right' })
  doc.text(`Due Date: ${dueDate}`, right, 31, { align: 'right' })
  doc.text('Status: Unpaid', right, 36.5, { align: 'right' })

  doc.setDrawColor(220, 220, 220)
  doc.line(left, 42, right, 42)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text('Bill To', left, 50)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(55, 55, 55)
  doc.text(data.client || 'Client Name', left, 56)
  doc.text(data.site || 'Site Address', left, 61)

  const lineItems = [
    ['1', 'Base Charges', '1', formatInr(data.baseCharge), formatInr(data.baseCharge)],
    ['2', `${data.workType} Survey Work`, String(data.totalPoints), formatInr(data.ratePerPoint), formatInr(pointsAmount)],
    ['3', 'Additional Charges', '1', formatInr(data.extraCharges), formatInr(data.extraCharges)],
    ['4', 'Discount', '1', '-', `- ${formatInr(data.discount)}`],
  ]

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Amount']],
    body: lineItems,
    theme: 'grid',
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 74 },
      2: { halign: 'right', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 34 },
      4: { halign: 'right', cellWidth: 34 },
    },
    margin: { left, right: pageWidth - right },
  })

  const summaryY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 130
  const labelX = right - 56
  const valueX = right

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(55, 55, 55)
  doc.setFontSize(9.5)
  doc.text('Subtotal', labelX, summaryY + 9)
  doc.text(formatInr(subtotal), valueX, summaryY + 9, { align: 'right' })
  doc.text(`Tax (${totalTaxPercent}%)`, labelX, summaryY + 15)
  doc.text(formatInr(taxAmount), valueX, summaryY + 15, { align: 'right' })
  doc.setDrawColor(210, 210, 210)
  doc.line(labelX, summaryY + 18, valueX, summaryY + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(30, 30, 30)
  doc.text('Total Due', labelX, summaryY + 25)
  doc.text(formatInr(grandTotal), valueX, summaryY + 25, { align: 'right' })

  const notesY = summaryY + 38
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text('Payment Details', left, notesY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.8)
  doc.setTextColor(75, 75, 75)
  doc.text('Union Bank: 144512010000444 (IFSC: UBIN0814458)', left, notesY + 5)
  doc.text('Canara Bank: 05862200005500 (IFSC: CNRB0010586)', left, notesY + 9.5)
  doc.text('UPI: 8643001010 / 7026016077', left, notesY + 14)
  doc.text('Payment terms: Due within 7 days from invoice date.', left, notesY + 18.5)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(95, 95, 95)
  doc.text('Thank you for your business.', left, notesY + 27)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 40)
  doc.text('Authorised Signatory', right, notesY + 27, { align: 'right' })

  const safeClient = (data.client || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const safeDate = new Date().toISOString().slice(0, 10)
  doc.save(`invoice-${safeClient}-${safeDate}.pdf`)
}

export type CombinedVisitLine = {
  visitId: string
  date: string
  machine: string
  amount: number
  notes?: string
}

export async function exportCombinedSiteInvoicePdf(data: {
  client: string
  site: string
  location?: string
  invoiceDate: string
  visits: CombinedVisitLine[]
}) {
  const visits = data.visits.filter((v) => v.amount > 0)
  const total = visits.reduce((sum, v) => sum + v.amount, 0)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const invoiceNo = `INV-${String(Math.floor(1000 + Math.random() * 9000))}`
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const left = 14
  const right = pageWidth - 14
  const logoDataUrl = await loadImageAsDataUrl(invoiceLogo)

  const watermarkSize = 105
  const watermarkX = (pageWidth - watermarkSize) / 2
  const watermarkY = (pageHeight - watermarkSize) / 2 + 10
  const pdfDoc = doc as jsPDF & {
    GState?: new (options: { opacity?: number }) => unknown
    setGState?: (state: unknown) => void
  }

  if (pdfDoc.GState && pdfDoc.setGState) {
    pdfDoc.setGState(new pdfDoc.GState({ opacity: 0.08 }))
    doc.addImage(logoDataUrl, 'JPEG', watermarkX, watermarkY, watermarkSize, watermarkSize)
    pdfDoc.setGState(new pdfDoc.GState({ opacity: 1 }))
  } else {
    doc.addImage(logoDataUrl, 'JPEG', watermarkX, watermarkY, watermarkSize, watermarkSize)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(30, 30, 30)
  doc.text('INVOICE (COMBINED)', left + 42, 20)
  doc.addImage(logoDataUrl, 'JPEG', left, 8, 34, 34)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text('SAMARTH LAND SURVEYORS', left, 24)
  doc.text('Bhoinagar Shahapur, Ichalkaranji', left, 28.5)
  doc.text('Contact: +91 8643001010 / +91 7026016077', left, 33)
  doc.text('Email: samarthlandsurveyors@gmail.com', left, 37.5)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(35, 35, 35)
  doc.setFontSize(9.5)
  doc.text(`Invoice No: ${invoiceNo}`, right, 20, { align: 'right' })
  doc.text(`Invoice Date: ${data.invoiceDate}`, right, 25.5, { align: 'right' })
  doc.text(`Due Date: ${dueDate}`, right, 31, { align: 'right' })
  doc.text('Status: Unpaid', right, 36.5, { align: 'right' })

  doc.setDrawColor(220, 220, 220)
  doc.line(left, 42, right, 42)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text('Bill To', left, 50)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(55, 55, 55)
  doc.text(data.client || 'Client Name', left, 56)
  const siteLine = [data.site || 'Site', data.location].filter(Boolean).join(' — ')
  doc.text(siteLine, left, 61)
  doc.setFontSize(8.8)
  doc.setTextColor(100, 100, 100)
  doc.text('This invoice covers all listed site visits for the above site.', left, 66)

  const tableBody = visits.map((v, i) => [
    String(i + 1),
    `${v.visitId} — ${v.date}\n${v.machine}${v.notes ? `\n${v.notes}` : ''}`,
    formatInr(v.amount),
  ])

  autoTable(doc, {
    startY: 71,
    head: [['#', 'Visit details', 'Amount']],
    body: tableBody.length ? tableBody : [['-', 'No billable visits', formatInr(0)]],
    theme: 'grid',
    headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 118 },
      2: { halign: 'right', cellWidth: 40 },
    },
    margin: { left, right: pageWidth - right },
  })

  const summaryY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 130
  const labelX = right - 56
  const valueX = right

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(30, 30, 30)
  doc.text('Total Due', labelX, summaryY + 14)
  doc.text(formatInr(total), valueX, summaryY + 14, { align: 'right' })

  const notesY = summaryY + 28
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text('Payment Details', left, notesY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.8)
  doc.setTextColor(75, 75, 75)
  doc.text('Union Bank: 144512010000444 (IFSC: UBIN0814458)', left, notesY + 5)
  doc.text('Canara Bank: 05862200005500 (IFSC: CNRB0010586)', left, notesY + 9.5)
  doc.text('UPI: 8643001010 / 7026016077', left, notesY + 14)
  doc.text('Payment terms: Due within 7 days from invoice date.', left, notesY + 18.5)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(95, 95, 95)
  doc.text('Thank you for your business.', left, notesY + 27)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 40)
  doc.text('Authorised Signatory', right, notesY + 27, { align: 'right' })

  const safeClient = (data.client || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const safeDate = new Date().toISOString().slice(0, 10)
  doc.save(`invoice-combined-${safeClient}-${safeDate}.pdf`)
}
