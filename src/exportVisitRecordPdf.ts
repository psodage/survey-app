import jsPDF from 'jspdf'

export type VisitRecordPdfData = {
  visitId: string
  client: string
  siteName: string
  location?: string
  date: string
  machine: string
  paymentMode: string
  amount: string
  notes?: string
  work?: string
  contactPerson?: string
  phone?: string
  dwgRefBy?: string
  dwgNo?: string
  engineerName?: string
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

function lineValue(doc: jsPDF, xStart: number, xEnd: number, y: number, value: string) {
  doc.setDrawColor(40, 40, 40)
  doc.line(xStart, y + 0.8, xEnd, y + 0.8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(24, 24, 24)
  doc.setFontSize(11.5)
  doc.text(value || '-', xStart + 1.2, y)
}

export async function exportVisitRecordPdf(data: VisitRecordPdfData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = 297
  const logoDataUrl = await loadImageAsDataUrl('/samarth-logo.png')

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, 210, 'F')
  doc.setDrawColor(60, 60, 60)
  doc.rect(6, 6, 285, 198)

  doc.addImage(logoDataUrl, 'PNG', 10, 10, 45, 24)

  doc.setTextColor(35, 35, 35)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('// SHREE //', pageWidth / 2, 12, { align: 'center' })
  doc.setFontSize(16)
  doc.text('SAMARTH', pageWidth / 2, 19, { align: 'center' })
  doc.text("LAND SURVEYOR'S", pageWidth / 2, 27, { align: 'center' })
  doc.roundedRect(pageWidth / 2 - 38, 29.5, 76, 11, 3, 3)
  doc.setFontSize(14)
  doc.text('DAILY SURVEY REPORT', pageWidth / 2, 37, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6)
  doc.text('Er. Shubham Bhoi - 8643001010', 211, 15)
  doc.text('Er. Sanket Katakar - 7026016077', 211, 21)
  doc.setFont('helvetica', 'italic')
  doc.text('samarthlandsurveyors@gmail.com', 211, 27)
  doc.setDrawColor(50, 50, 50)
  doc.line(10, 42, 286, 42)

  const leftLabel = 10
  const leftValueStart = 52
  const rightLabel = 117
  const rightValueStart = 152
  const rowGap = 13
  let y = 53

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Site Report No. :', leftLabel, y)
  lineValue(doc, leftValueStart, 108, y, data.visitId)
  doc.text('Visit No. :', rightLabel, y)
  lineValue(doc, rightValueStart, 197, y, data.visitId.replace('SV-', ''))
  doc.text('Date. :', 212, y)
  lineValue(doc, 228, 286, y, data.date)

  y += rowGap
  doc.text('Name of Client :', leftLabel, y)
  lineValue(doc, leftValueStart, 286, y, data.client)

  y += rowGap
  doc.text('Site Name & Address :', leftLabel, y)
  lineValue(doc, leftValueStart, 286, y, `${data.siteName}${data.location ? `, ${data.location}` : ''}`)

  y += rowGap
  doc.text('Contact Person :', leftLabel, y)
  lineValue(doc, leftValueStart, 200, y, data.contactPerson ?? '-')
  doc.text('Ph. :', 212, y)
  lineValue(doc, 228, 286, y, data.phone ?? '-')

  y += rowGap
  doc.text('DWG. Ref. By :', leftLabel, y)
  lineValue(doc, leftValueStart, 170, y, data.dwgRefBy ?? '-')
  doc.text('DWG. No. :', 174, y)
  lineValue(doc, 195, 286, y, data.dwgNo ?? '-')

  y += rowGap
  doc.text('Inst Make :', leftLabel, y)
  lineValue(doc, leftValueStart, 152, y, data.machine)
  doc.text('Engg. Name :', 157, y)
  lineValue(doc, 184, 286, y, data.engineerName ?? '-')

  y += rowGap
  doc.text('Work Type :', leftLabel, y)
  lineValue(doc, leftValueStart, 286, y, data.work ?? '-')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(60, 60, 60)
  doc.text('Plane Table / P.T.& Contour / Stake Out / Line Out', 61, y - 4)

  y += rowGap
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(35, 35, 35)
  doc.text('Other Details :', leftLabel, y)
  lineValue(doc, leftValueStart, 286, y, `${data.notes ?? '-'}  |  Payment: ${data.paymentMode}  |  Rs ${data.amount}`)

  const signY = 182
  doc.line(12, signY, 90, signY)
  doc.line(108, signY, 186, signY)
  doc.line(204, signY, 282, signY)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Survey Engg.', 50, 188, { align: 'center' })
  doc.text('Site Engg Sign', 147, 188, { align: 'center' })
  doc.text('Client Sign', 243, 188, { align: 'center' })

  doc.line(10, 193, 286, 193)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Office Add. - Bhoinagar Shahapur, Ichalkaranji - 416 121', 12, 199)

  const safeDate = new Date().toISOString().slice(0, 10)
  doc.save(`visit-record-${data.visitId}-${safeDate}.pdf`)
}
