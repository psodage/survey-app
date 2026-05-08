import {
  Bell,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  FileText,
  LogOut,
  Mail,
  Menu,
  MapPin,
  Phone,
  Ruler,
  Settings2,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import invoiceLogo from './assets/logo.jpeg'
import { signOut } from './signOut'

type NavItem = {
  label: string
  icon: ReactNode
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <Building2 size={16} /> },
  { label: 'Account Manager', icon: <Briefcase size={16} /> },
  { label: 'Clients & Sites', icon: <UsersRound size={16} /> },
  { label: 'Site Visits', icon: <ClipboardList size={16} /> },
  { label: 'Measurement', icon: <Calculator size={16} /> },
  { label: 'Settings', icon: <Settings2 size={16} /> },
  { label: 'Log Out', icon: <LogOut size={16} /> },
]

type MeasurementRateCalculatorProps = {
  onNavigate: (path: string) => void
}

function SummaryCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string
  value: string
  tone: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 md:rounded-2xl md:p-5 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-neutral-500 md:text-sm">{title}</p>
          <p className="mt-1.5 text-base font-extrabold tracking-tight text-neutral-900 md:mt-2 md:text-2xl">
            {value}
          </p>
        </div>
        <span className={['grid h-10 w-10 place-items-center rounded-2xl md:h-11 md:w-11', tone].join(' ')}>
          {icon}
        </span>
      </div>
    </div>
  )
}

function FieldLabel({ label }: { label: string }) {
  return <label className="mb-1.5 block text-xs font-bold tracking-wide text-neutral-600">{label}</label>
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

export default function MeasurementRateCalculator({ onNavigate }: MeasurementRateCalculatorProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()
  const [formValues, setFormValues] = useState({
    client: 'RN Construction',
    site: 'Kolhapur Cancer Centre, Kolhapur',
    machineType: 'Total Station',
    workType: 'Plane Table',
    totalPoints: '55',
    ratePerPoint: '80',
    baseCharge: '1500',
    extraCharges: '1500',
    discount: '0',
    measurementDate: '17-04-2026',
  })

  const mobileBottomNav = [
    { label: 'Dashboard', path: '/dashboard', icon: Building2 },
    { label: 'Accounts', path: '/account-manager', icon: Briefcase },
    { label: 'Clients', path: '/clients-sites', icon: UsersRound },
    { label: 'Sites', path: '/site-visits', icon: MapPin },
    { label: 'Measure', path: '/measurement-rate-calculator', icon: Calculator },
    { label: 'Settings', path: '/settings', icon: Settings2 },
  ] as const

  const handleNavClick = async (label: string) => {
    if (label === 'Log Out') {
      await signOut()
      setIsSidebarOpen(false)
      onNavigate('/login')
      return
    }
    const routeMap: Record<string, string> = {
      Dashboard: '/dashboard',
      'Account Manager': '/account-manager',
      'Clients & Sites': '/clients-sites',
      'Site Visits': '/site-visits',
      Measurement: '/measurement-rate-calculator',
      Settings: '/settings',
    }
    const nextPath = routeMap[label]
    if (nextPath) onNavigate(nextPath)
    setIsSidebarOpen(false)
  }

  const updateFormValue = (field: keyof typeof formValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  const parseMoney = (value: string) => Number(value.replace(/[^\d.-]/g, '')) || 0
  const formatInr = (value: number) => `Rs ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const currentDateLabel = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const handleResetForm = () => {
    setFormValues({
      client: 'RN Construction',
      site: 'Kolhapur Cancer Centre, Kolhapur',
      machineType: 'Total Station',
      workType: 'Plane Table',
      totalPoints: '55',
      ratePerPoint: '80',
      baseCharge: '1500',
      extraCharges: '1500',
      discount: '0',
      measurementDate: '17-04-2026',
    })
  }

  const handleGenerateInvoice = async () => {
    const points = Number(formValues.totalPoints) || 0
    const ratePerPoint = parseMoney(formValues.ratePerPoint)
    const baseCharge = parseMoney(formValues.baseCharge)
    const extraCharges = parseMoney(formValues.extraCharges)
    const discount = parseMoney(formValues.discount)

    const pointsAmount = points * ratePerPoint
    const subtotal = baseCharge + pointsAmount + extraCharges
    const total = Math.max(0, subtotal - discount)

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const invoiceNo = `INV-${String(Math.floor(1000 + Math.random() * 9000))}`
    const invoiceDate = formValues.measurementDate || new Date().toLocaleDateString('en-GB')
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')
    const totalTaxPercent = 0
    const taxAmount = (total * totalTaxPercent) / 100
    const grandTotal = total + taxAmount

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const left = 14
    const right = pageWidth - 14
    const logoDataUrl = await loadImageAsDataUrl(invoiceLogo)

    // Watermark logo (behind invoice content)
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
      // Fallback when gState is unavailable.
      doc.addImage(logoDataUrl, 'JPEG', watermarkX, watermarkY, watermarkSize, watermarkSize)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(30, 30, 30)
    doc.text('INVOICE', left + 42, 20)

    // Square logo.jpeg renders best with 1:1 box; previous wide box made it look cut/small.
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
    doc.text(`Invoice Date: ${invoiceDate}`, right, 25.5, { align: 'right' })
    doc.text(`Due Date: ${dueDate}`, right, 31, { align: 'right' })
    doc.text(`Status: Unpaid`, right, 36.5, { align: 'right' })

    doc.setDrawColor(220, 220, 220)
    doc.line(left, 42, right, 42)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.text('Bill To', left, 50)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(55, 55, 55)
    doc.text(formValues.client || 'Client Name', left, 56)
    doc.text(formValues.site || 'Site Address', left, 61)

    const lineItems = [
      ['1', 'Base Charges', '1', formatInr(baseCharge), formatInr(baseCharge)],
      ['2', `${formValues.workType} Survey Work`, String(points), formatInr(ratePerPoint), formatInr(pointsAmount)],
      ['3', 'Additional Charges', '1', formatInr(extraCharges), formatInr(extraCharges)],
      ['4', 'Discount', '1', '-', `- ${formatInr(discount)}`],
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

    const safeClient = (formValues.client || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const safeDate = new Date().toISOString().slice(0, 10)
    doc.save(`invoice-${safeClient}-${safeDate}.pdf`)
  }

  return (
    <div className="flex h-[100svh] max-h-[100svh] min-h-[100svh] flex-col overflow-hidden bg-black md:h-dvh md:max-h-dvh md:min-h-dvh md:bg-neutral-100">
      <div className="flex min-h-0 flex-1 w-full max-w-none">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[280px] flex-col bg-gradient-to-b from-[#050505] via-[#0b0b0b] to-[#040404] pb-20 text-white lg:flex">
          <div className="px-6 pt-7">
            <img src="/samarth-logo.png" alt="Samarth Land Surveyors" className="h-25 w-auto" draggable={false} />
          </div>
          <nav className="mt-5 flex-1 px-3">
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = item.label === 'Measurement'
                const isLogout = item.label === 'Log Out'
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => handleNavClick(item.label)}
                    className={[
                      'group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition',
                      isLogout
                        ? 'bg-red-500/15 text-red-300 ring-1 ring-red-400/35 hover:bg-red-500/20 hover:text-red-200'
                        : active
                          ? 'bg-[#f39b03]/18 text-[#f39b03] ring-1 ring-[#f39b03]/30'
                          : 'text-white/85 hover:bg-white/5 hover:text-white',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'grid h-8 w-8 place-items-center rounded-lg',
                        isLogout ? 'bg-red-500/18 text-red-300' : active ? 'bg-[#f39b03]/14' : 'bg-white/5',
                      ].join(' ')}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </aside>

        {isSidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="Close sidebar overlay"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}
        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-y-auto bg-gradient-to-b from-[#050505] via-[#0b0b0b] to-[#040404] pb-20 text-white transition-transform duration-300 lg:hidden',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="flex items-center justify-between px-5 pt-6">
            <span className="text-sm font-extrabold tracking-tight text-white">Profile</span>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-6 px-5">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex flex-col items-center text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
                  <CircleUserRound size={32} strokeWidth={1.75} />
                </div>
                <div className="mt-3 text-base font-extrabold text-white">Er. Shubham Bhoi</div>
                <div className="mt-1 text-xs font-semibold text-white/65">Admin</div>
              </div>
            </div>
          </div>
          <div className="mt-5 px-5">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-white/45">Quick navigation</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { label: 'Dashboard', path: '/dashboard', icon: Building2 },
                { label: 'Accounts', path: '/account-manager', icon: Briefcase },
                { label: 'Clients', path: '/clients-sites', icon: UsersRound },
                { label: 'Visits', path: '/site-visits', icon: ClipboardList },
                { label: 'Measurement', path: '/measurement-rate-calculator', icon: Calculator },
                { label: 'Settings', path: '/settings', icon: Settings2 },
              ].map(({ label, path, icon: Icon }) => (
                <button
                  type="button"
                  key={path}
                  onClick={() => {
                    onNavigate(path)
                    setIsSidebarOpen(false)
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white/5 px-2 py-3 text-[11px] font-bold text-white/85 ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  <Icon size={18} />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-[280px]">
          <header className="sticky top-0 z-10 shrink-0 bg-white backdrop-blur">
            <div className="border-b border-white/10 bg-black md:hidden">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/15"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu size={18} strokeWidth={2.25} className="text-white" />
                </button>
                <div className="flex min-w-0 justify-center px-1">
                  <img
                    src="/samarth-logo.png"
                    alt="Samarth Land Surveyors"
                    className="h-14 max-h-[68px] w-auto max-w-full object-contain object-center sm:h-[72px] sm:max-h-[72px]"
                    draggable={false}
                  />
                </div>
                <button
                  type="button"
                  className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-white ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  <Bell size={18} strokeWidth={2} className="text-white" />
                </button>
              </div>
              <div className="border-t border-white/10 px-4 py-3">
                <h1 className="min-w-0 truncate text-left text-base font-extrabold leading-tight tracking-tight text-white">
                  Measurement Calculator
                </h1>
              </div>
            </div>

            <div className="relative hidden w-full items-center justify-between gap-4 border-b border-neutral-200 bg-white px-6 py-4 shadow-[0_6px_20px_rgba(16,24,40,0.05)] md:flex lg:px-8">
              <div className="min-w-0 truncate text-xl font-extrabold tracking-tight text-neutral-950">
                Measurement &amp; Rate Calculator
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900"
                >
                  <Calendar size={16} className="text-[#f39b03]" />
                  <span>{currentDateLabel}</span>
                </button>
                <div className="hidden items-center gap-3 rounded-xl bg-neutral-100 px-4 py-2.5 ring-1 ring-black/5 sm:flex">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f39b03]/15 text-[#f39b03]">
                    <CircleUserRound size={18} />
                  </div>
                  <div className="text-left">
                    <div className="truncate text-sm font-extrabold text-neutral-900">Er. Shubham Bhoi</div>
                    <div className="text-[11px] font-semibold text-neutral-600">Admin</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] sm:px-6 sm:pt-6 sm:pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] md:p-6 md:pb-24 lg:p-8 lg:pb-28">
            <section className="mx-auto w-full max-w-[1400px]">
              <div className="mt-0 grid grid-cols-2 gap-3 md:mt-0 md:grid-cols-4 md:gap-4">
                <SummaryCard
                  title="Total Measurements"
                  value="132"
                  tone="bg-[#f39b03]/15 text-[#f39b03]"
                  icon={<Ruler size={18} />}
                />
                <SummaryCard
                  title="Total Points"
                  value="8,450"
                  tone="bg-sky-100 text-sky-600"
                  icon={<ClipboardList size={18} />}
                />
                <SummaryCard
                  title="Estimated Amount"
                  value="₹ 4,85,300"
                  tone="bg-emerald-100 text-emerald-600"
                  icon={<Wallet size={18} />}
                />
                <SummaryCard
                  title="Pending Billing"
                  value="₹ 92,400"
                  tone="bg-rose-100 text-rose-600"
                  icon={<FileText size={18} />}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
             
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f39b03] px-4 text-sm font-bold text-white sm:h-auto sm:py-2.5 mt-2"
              >
                + Add Rate
              </button>
              </div>

              <section className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:mt-6 md:rounded-2xl md:p-6 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
                <h2 className="text-base font-extrabold tracking-tight text-neutral-900 md:text-lg">
                  New Measurement Entry
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <FieldLabel label="Client" />
                  <select
                    value={formValues.client}
                    onChange={(e) => updateFormValue('client', e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                  >
                    <option>RN Construction</option>
                    <option>Amit Developers</option>
                    <option>Shree Krishna Infra</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Site" />
                  <select
                    value={formValues.site}
                    onChange={(e) => updateFormValue('site', e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                  >
                    <option>Kolhapur Cancer Centre, Kolhapur</option>
                    <option>Sai Residency, Pune</option>
                    <option>Green Valley, Pune</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Machine Type" />
                  <select
                    value={formValues.machineType}
                    onChange={(e) => updateFormValue('machineType', e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                  >
                    <option>Total Station</option>
                    <option>DGPS</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Work Type" />
                  <select
                    value={formValues.workType}
                    onChange={(e) => updateFormValue('workType', e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                  >
                    <option>Plane Table</option>
                    <option>P.T. &amp; Contour</option>
                    <option>Stake Out</option>
                    <option>Line Out</option>
                    <option>Excavation Points</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Total Points" />
                  <input
                    value={formValues.totalPoints}
                    onChange={(e) => updateFormValue('totalPoints', e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                    placeholder="0"
                  />
                </div>
                <div>
                  <FieldLabel label="Rate Per Point" />
                  <input
                    value={formValues.ratePerPoint}
                    onChange={(e) => updateFormValue('ratePerPoint', e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                    placeholder="₹ 0"
                  />
                </div>
                <div>
                  <FieldLabel label="Base Charge" />
                  <input
                    value={formValues.baseCharge}
                    onChange={(e) => updateFormValue('baseCharge', e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                    placeholder="₹ 0"
                  />
                </div>
                <div>
                  <FieldLabel label="Extra Charges" />
                  <input
                    value={formValues.extraCharges}
                    onChange={(e) => updateFormValue('extraCharges', e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                    placeholder="₹ 0"
                  />
                </div>
                <div>
                  <FieldLabel label="Discount" />
                  <input
                    value={formValues.discount}
                    onChange={(e) => updateFormValue('discount', e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                    placeholder="₹ 0"
                  />
                </div>
                <div>
                  <FieldLabel label="Measurement Date" />
                  <div className="relative">
                    <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#f39b03]" />
                    <input
                      type="text"
                      value={formValues.measurementDate}
                      onChange={(e) => updateFormValue('measurementDate', e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-8 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                      placeholder="DD-MM-YYYY"
                    />
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  </div>
                </div>
                </div>
                <div className="mt-4 rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 md:text-xs">
                    Calculation Preview
                  </p>
                  <p className="mt-2 text-sm font-semibold text-neutral-700">
                    Base Charge + (Total Points × Rate Per Point) + Extra Charges - Discount
                  </p>
                  <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#f39b03]">₹ 7,100</p>
                </div>
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="h-11 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-700"
                  >
                    Reset
                  </button>
                  <button type="button" className="h-11 rounded-xl bg-neutral-900 px-4 text-sm font-bold text-white">
                    Save Measurement
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateInvoice}
                    className="h-11 rounded-xl bg-[#f39b03] px-4 text-sm font-bold text-white"
                  >
                    Generate Invoice
                  </button>
                </div>
              </section>

             

            
            </section>
          </div>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex w-full flex-col border-t border-white/10 bg-black [transform:translate3d(0,0,0)] md:hidden"
        aria-label="Mobile primary navigation"
      >
        <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-0 px-1 pt-1.5 pb-1">
          {mobileBottomNav.map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <button
                type="button"
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={[
                  'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold transition',
                  active ? 'text-[#f39b03]' : 'text-white/50 hover:text-white/80',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid h-8 w-8 place-items-center rounded-lg transition',
                    active ? 'bg-[#f39b03]/20 text-[#f39b03]' : 'bg-white/5 text-white/55',
                  ].join(' ')}
                >
                  <Icon size={18} strokeWidth={active ? 2.25 : 2} />
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
        <div aria-hidden className="mobile-nav-safe-spacer" />
      </nav>

      <footer className="fixed inset-x-0 bottom-0 z-50 hidden border-t border-white/10 bg-gradient-to-b from-[#050505] via-[#0b0b0b] to-[#040404] text-white shadow-[0_-12px_30px_rgba(0,0,0,0.3)] md:block">
        <div className="mx-auto flex w-full max-w-none items-center justify-between gap-3 px-3 py-2 sm:px-5 sm:py-3">
          <img src="/samarth-logo.png" alt="Samarth Land Surveyors" className="h-9 w-auto shrink-0 sm:h-10" draggable={false} />
          <div className="hidden min-w-0 flex-1 items-center justify-end text-xs font-bold text-white/95 md:flex">
            <div className="flex min-w-0 items-center gap-2 pr-5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f39b03]/20 text-[#f39b03] ring-1 ring-[#f39b03]/45">
                <Phone size={13} />
              </span>
              <span className="truncate">Er. SHUBHAM BHOI 8643 00 1010</span>
            </div>
            <div className="h-6 w-px bg-white/25" />
            <div className="flex min-w-0 items-center gap-2 px-5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f39b03]/20 text-[#f39b03] ring-1 ring-[#f39b03]/45">
                <Phone size={13} />
              </span>
              <span className="truncate">Er. SANKET KATAKAR 7026 01 6077</span>
            </div>
            <div className="h-6 w-px bg-white/25" />
            <div className="flex min-w-0 items-center gap-2 px-5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f39b03]/20 text-[#f39b03] ring-1 ring-[#f39b03]/45">
                <Phone size={13} />
              </span>
              <span className="truncate">Er. SHUBHAM SODAGE 95959755566</span>
            </div>
            <div className="h-6 w-px bg-white/25" />
            <div className="flex min-w-0 items-center gap-2 px-5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f39b03]/20 text-[#f39b03] ring-1 ring-[#f39b03]/45">
                <Phone size={13} />
              </span>
              <span className="truncate">Er. PRAJWAL PATIL 7058129002</span>
            </div>
            <div className="h-6 w-px bg-white/25" />
            <div className="flex min-w-0 items-center gap-2 pl-5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f39b03]/20 text-[#f39b03] ring-1 ring-[#f39b03]/45">
                <Mail size={13} />
              </span>
              <span className="truncate">samarthlandsurveyors@gmail.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
