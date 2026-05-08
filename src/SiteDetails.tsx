import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  CircleUserRound,
  CircleDollarSign,
  ClipboardList,
  Download,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  UsersRound,
  User2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { exportVisitRecordPdf } from './exportVisitRecordPdf'
import { signOut } from './signOut'

type NavItem = {
  label: string
  icon: ReactNode
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutGrid size={16} /> },
  { label: 'Account Manager', icon: <Briefcase size={16} /> },
  { label: 'Clients & Sites', icon: <UsersRound size={16} /> },
  { label: 'Site Visits', icon: <ClipboardList size={16} /> },
  { label: 'Measurement', icon: <Calculator size={16} /> },
  { label: 'Settings', icon: <Building2 size={16} /> },
  { label: 'Log Out', icon: <LogOut size={16} /> },
]

type SiteDetailsProps = {
  onNavigate: (path: string) => void
}

type SiteVisitRecord = {
  id: string
  client: string
  site: string
  date: string
  machine: string
  amount: string
  paymentMode: string
  notes: string
  work?: string
}

const siteVisitRecords: SiteVisitRecord[] = [
  {
    id: 'SV-2451',
    client: 'Amit Developers',
    site: 'Sai Residency',
    date: '20 May 2025',
    machine: 'Total Station',
    amount: '15,000',
    paymentMode: 'Cash',
    notes: 'Completed boundary points and levels.',
    work: 'Topographic survey for layout planning and road alignment.',
  },
  {
    id: 'SV-2437',
    client: 'Amit Developers',
    site: 'Sai Residency',
    date: '09 May 2025',
    machine: 'Auto Level',
    amount: '10,000',
    paymentMode: 'UPI',
    notes: 'Road level transfer done for internal roads.',
    work: 'Road level transfer and benchmark verification.',
  },
  {
    id: 'SV-2422',
    client: 'Amit Developers',
    site: 'Sunrise Enclave',
    date: '01 May 2025',
    machine: 'GPS / GNSS',
    amount: '12,500',
    paymentMode: 'Bank Transfer',
    notes: 'Control points established for next phase.',
    work: 'Plot boundary staking and control point marking.',
  },
]

export default function SiteDetails({ onNavigate }: SiteDetailsProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode') ?? 'site'
  const isVisitMode = mode === 'visit'
  const client = params.get('client') ?? 'Unknown Client'
  const name = params.get('name') ?? 'Unknown Site'
  const location = params.get('location') ?? 'Unknown Location'
  const lastVisit = params.get('lastVisit') ?? '-'
  const status = params.get('status') ?? 'Active'
  const pending = params.get('pending') ?? '₹0'
  const visitId = params.get('visitId') ?? '-'
  const visitDate = params.get('date') ?? '-'
  const machine = params.get('machine') ?? '-'
  const amount = params.get('amount') ?? '0'
  const paymentMode = params.get('paymentMode') ?? '-'
  const notes = params.get('notes') ?? '-'
  const work = params.get('work') ?? '-'
  const relatedVisitRecords = siteVisitRecords.filter((record) => record.client === client && record.site === name)
  const pageTitle = isVisitMode ? 'Site Visit Details' : 'Site Details'
  const backPath = isVisitMode ? '/site-visits' : '/clients-sites'
  const activeNavLabel = isVisitMode ? 'Site Visits' : 'Clients & Sites'
  const statusLabel = isVisitMode ? 'Visit Record' : status
  const mobileBottomNav = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { label: 'Accounts', path: '/account-manager', icon: Briefcase },
    { label: 'Clients', path: '/clients-sites', icon: UsersRound },
    { label: 'Sites', path: '/site-visits', icon: MapPin },
    { label: 'Measure', path: '/measurement-rate-calculator', icon: Calculator },
    { label: 'Settings', path: '/settings', icon: Building2 },
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

  const statusTone =
    status === 'Completed'
      ? 'bg-neutral-100 text-neutral-700 ring-neutral-200'
      : status === 'On Hold'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-200'

  const handleExportVisitPdf = (record: {
    visitId: string
    date: string
    machine: string
    amount: string
    paymentMode: string
    notes?: string
    work?: string
  }) => {
    void exportVisitRecordPdf({
      visitId: record.visitId,
      client,
      siteName: name,
      location,
      date: record.date,
      machine: record.machine,
      paymentMode: record.paymentMode,
      amount: record.amount,
      notes: record.notes,
      work: record.work,
      contactPerson: 'Site Coordinator',
      phone: '-',
      dwgRefBy: 'Samarth Land Surveyors',
      dwgNo: record.visitId.replace('SV-', ''),
      engineerName: 'Er. Shubham Bhoi',
    })
  }

  const detailCards: { title: string; value: string; icon: LucideIcon; tone: string; cardTint: string }[] = isVisitMode
    ? [
        {
          title: 'Client',
          value: client,
          icon: User2,
          tone: 'bg-sky-100 text-sky-700',
          cardTint: 'bg-sky-50/90',
        },
        {
          title: 'Visit ID',
          value: visitId,
          icon: ClipboardList,
          tone: 'bg-violet-100 text-violet-700',
          cardTint: 'bg-violet-50/90',
        },
        {
          title: 'Visit Date',
          value: visitDate,
          icon: Calendar,
          tone: 'bg-amber-100 text-amber-700',
          cardTint: 'bg-amber-50/90',
        },
        {
          title: 'Amount',
          value: `Rs ${amount}`,
          icon: CircleDollarSign,
          tone: 'bg-emerald-100 text-emerald-700',
          cardTint: 'bg-emerald-50/90',
        },
      ]
    : [
    {
      title: 'Client',
      value: client,
      icon: User2,
      tone: 'bg-sky-100 text-sky-700',
      cardTint: 'bg-sky-50/90',
    },
    {
      title: 'Location',
      value: location,
      icon: MapPin,
      tone: 'bg-emerald-100 text-emerald-700',
      cardTint: 'bg-emerald-50/90',
    },
    {
      title: 'Last Visit',
      value: lastVisit,
      icon: Calendar,
      tone: 'bg-amber-100 text-amber-700',
      cardTint: 'bg-amber-50/90',
    },
    {
      title: 'Pending Amount',
      value: pending,
      icon: CircleDollarSign,
      tone: 'bg-rose-100 text-rose-700',
      cardTint: 'bg-rose-50/90',
    },
      ]

  return (
    <div className="flex h-[100svh] max-h-[100svh] min-h-[100svh] flex-col overflow-hidden bg-black md:h-dvh md:max-h-dvh md:min-h-dvh md:bg-neutral-100">
      <div className="flex min-h-0 flex-1 w-full max-w-none">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[280px] flex-col bg-gradient-to-b from-[#050505] via-[#0b0b0b] to-[#040404] pb-20 text-white lg:flex">
          <div className="px-6 pt-7">
            <div className="flex items-center gap-3">
              <img
                src="/samarth-logo.png"
                alt="Samarth Land Surveyors"
                className="h-25 w-auto"
                draggable={false}
              />
            </div>
          </div>

          <nav className="mt-5 flex-1 px-3">
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = item.label === activeNavLabel
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
          <div className="flex items-center justify-between px-6 pt-6">
            <img
              src="/samarth-logo.png"
              alt="Samarth Land Surveyors"
              className="h-10 w-auto"
              draggable={false}
            />
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
              aria-label="Close menu"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <nav className="mt-4 flex-1 px-3">
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = item.label === activeNavLabel
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

        <main className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-[280px]">
          <header className="sticky top-0 z-10 shrink-0 bg-white backdrop-blur">
            <div className="border-b border-white/10 bg-black md:hidden">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/15"
                  aria-label="Open menu"
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
                  onClick={() => onNavigate(backPath)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/15"
                  aria-label="Back to clients and sites"
                >
                  <ArrowLeft size={18} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                <h1 className="min-w-0 truncate text-left text-base font-extrabold leading-tight tracking-tight text-white">
                  {pageTitle}
                </h1>
                <span className="inline-flex items-center rounded-xl border border-white/20 bg-neutral-900 px-2.5 py-2 text-[11px] font-semibold leading-tight text-white">
                  {statusLabel}
                </span>
              </div>
            </div>

            <div className="relative hidden w-full items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-2.5 shadow-[0_6px_20px_rgba(16,24,40,0.05)] sm:px-6 md:flex md:px-6 md:py-4 lg:px-8">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-neutral-50 md:h-10 md:w-10 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)] lg:hidden"
                  aria-label="Open menu"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu size={18} className="text-neutral-900" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(backPath)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-extrabold text-neutral-800 transition hover:bg-neutral-50"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <div className="truncate text-lg font-extrabold tracking-tight text-neutral-950 sm:text-xl">
                  {pageTitle}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <span className={['inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1', statusTone].join(' ')}>
                  {statusLabel}
                </span>
                <div className="hidden items-center gap-3 rounded-xl bg-neutral-100 px-3 py-2 ring-1 ring-black/5 sm:flex sm:px-4 sm:py-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f39b03]/15 text-[#f39b03]">
                    <CircleUserRound size={18} />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-xs font-extrabold text-neutral-900 sm:text-sm">Er. Shubham Bhoi</div>
                    <div className="text-[11px] font-semibold text-neutral-600">Admin</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] sm:px-6 sm:pt-6 sm:pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] md:p-6 md:pb-24 lg:p-8 lg:pb-28">
            <div className="space-y-4 md:space-y-6">
              <section className="rounded-xl bg-neutral-900/[0.04] p-4 shadow-sm ring-1 ring-black/5 md:rounded-2xl md:bg-white md:p-6 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
                <div className="text-[11px] font-semibold text-neutral-500 md:text-sm">Site Name</div>
                <div className="mt-1 text-lg font-extrabold tracking-tight text-neutral-950 md:text-3xl">{name}</div>
                <div className="mt-3 hidden items-center rounded-full bg-[#f39b03]/12 px-3 py-1 text-xs font-extrabold text-[#c97702] ring-1 ring-[#f39b03]/25 md:inline-flex">
                  {statusLabel}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                {detailCards.map((card) => (
                  <div
                    key={card.title}
                    className={`rounded-xl p-3 shadow-sm ring-1 ring-black/5 ${card.cardTint} md:bg-white md:p-4`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${card.tone}`}>
                        <card.icon size={15} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-neutral-500">{card.title}</div>
                        <div
                          className={`mt-0.5 truncate text-sm font-extrabold md:text-base ${
                            card.title === 'Pending Amount' ? 'text-rose-600' : 'text-neutral-900'
                          }`}
                        >
                          {card.value}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              {isVisitMode ? (
                <section className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 md:rounded-2xl md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
                  <div className="border-b border-neutral-200 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="text-xs font-extrabold tracking-tight text-neutral-900 md:text-sm">Visit Details</div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 p-4 text-sm font-semibold text-neutral-700 sm:grid-cols-2 sm:px-6 sm:py-5">
                    <p>
                      <span className="text-neutral-500">Machine:</span> {machine}
                    </p>
                    <p>
                      <span className="text-neutral-500">Payment Mode:</span> {paymentMode}
                    </p>
                    <p className="sm:col-span-2">
                      <span className="text-neutral-500">Notes:</span> {notes}
                    </p>
                    <p className="sm:col-span-2">
                      <span className="text-neutral-500">Work Details:</span> {work}
                    </p>
                  </div>
                  <div className="border-t border-neutral-200 px-4 py-3 sm:px-6 sm:py-4">
                    <button
                      type="button"
                      onClick={() =>
                        handleExportVisitPdf({
                          visitId,
                          date: visitDate,
                          machine,
                          amount,
                          paymentMode,
                          notes,
                          work,
                        })
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#f39b03] px-4 text-xs font-extrabold text-white transition hover:bg-[#e18e03] sm:text-sm"
                    >
                      <Download size={15} />
                      Generate PDF
                    </button>
                  </div>
                </section>
              ) : (
                <section className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 md:rounded-2xl md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
                  <div className="border-b border-neutral-200 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="text-xs font-extrabold tracking-tight text-neutral-900 md:text-sm">Visit Record</div>
                  </div>

                  {relatedVisitRecords.length === 0 ? (
                    <div className="px-4 py-5 text-sm font-semibold text-neutral-600 sm:px-6">
                      No visit records found for this site.
                    </div>
                  ) : (
                    <>
                      <div className="md:hidden">
                        <ul className="flex flex-col gap-2 p-3">
                          {relatedVisitRecords.map((record) => (
                            <li key={`${record.id}-mobile`} className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-extrabold text-neutral-900">{record.id}</div>
                                  <div className="mt-0.5 text-[10px] font-semibold text-neutral-500">{record.date}</div>
                                </div>
                                <span className="shrink-0 text-xs font-extrabold text-emerald-600">Rs {record.amount}</span>
                              </div>
                              <div className="mt-2 text-[11px] font-semibold text-neutral-600">
                                {record.machine} • {record.paymentMode}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleExportVisitPdf({
                                    visitId: record.id,
                                    date: record.date,
                                    machine: record.machine,
                                    amount: record.amount,
                                    paymentMode: record.paymentMode,
                                    notes: record.notes,
                                    work: record.work,
                                  })
                                }
                                className="mt-3 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-[10px] font-extrabold text-neutral-800 transition hover:bg-neutral-50"
                              >
                                <Download size={12} />
                                PDF
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[760px] border-collapse">
                          <thead className="bg-neutral-50">
                            <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                              <th className="px-4 py-3">Visit ID</th>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Machine</th>
                              <th className="px-4 py-3">Payment</th>
                              <th className="px-4 py-3 text-right">Amount</th>
                              <th className="px-4 py-3">Notes</th>
                              <th className="px-4 py-3 text-center">PDF</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm font-semibold text-neutral-800">
                            {relatedVisitRecords.map((record) => (
                              <tr key={record.id} className="border-t border-neutral-200">
                                <td className="px-4 py-3 font-extrabold text-neutral-900">{record.id}</td>
                                <td className="px-4 py-3">{record.date}</td>
                                <td className="px-4 py-3">{record.machine}</td>
                                <td className="px-4 py-3">{record.paymentMode}</td>
                                <td className="px-4 py-3 text-right font-extrabold text-emerald-600">Rs {record.amount}</td>
                                <td className="px-4 py-3 text-neutral-700">{record.notes}</td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleExportVisitPdf({
                                        visitId: record.id,
                                        date: record.date,
                                        machine: record.machine,
                                        amount: record.amount,
                                        paymentMode: record.paymentMode,
                                        notes: record.notes,
                                        work: record.work,
                                      })
                                    }
                                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-[11px] font-extrabold text-neutral-800 transition hover:bg-neutral-50"
                                  >
                                    <Download size={12} />
                                    PDF
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>
          </div>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex w-full flex-col border-t border-white/10 bg-black [transform:translate3d(0,0,0)] md:hidden"
        aria-label="Mobile primary navigation"
      >
        <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-0 px-1 pt-1.5 pb-1">
          {mobileBottomNav.map((item) => {
            const active = item.path === (isVisitMode ? '/site-visits' : '/clients-sites')
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
          <img
            src="/samarth-logo.png"
            alt="Samarth Land Surveyors"
            className="h-9 w-auto shrink-0 sm:h-10"
            draggable={false}
          />
          <div className="min-w-0 flex-1 text-right text-[11px] font-bold text-white/90">
            Samarth Land Surveyors
          </div>
        </div>
      </footer>
    </div>
  )
}
