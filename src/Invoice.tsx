import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  FileBarChart,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  Phone,
  UsersRound,
  X,
} from 'lucide-react'
import { Fragment, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AccountManagerSidebarBlock } from './AccountManagerSidebarBlock'
import { CollaborationBrandMark } from './CollaborationBrandMark'
import { CardShell } from './dashboardCards'
import { exportInvoicePdf } from './exportInvoicePdf'
import { getHeaderDateLabel } from './headerDateLabel'
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
  { label: 'Reports', icon: <FileBarChart size={16} /> },
  { label: 'Settings', icon: <Building2 size={16} /> },
  { label: 'Log Out', icon: <LogOut size={16} /> },
]

type InvoiceProps = {
  onNavigate: (path: string) => void
}

function FieldLabel({ label }: { label: string }) {
  return <label className="mb-1.5 block text-xs font-bold tracking-wide text-neutral-600">{label}</label>
}

export default function Invoice({ onNavigate }: InvoiceProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const headerDateLabel = getHeaderDateLabel()
  const [formValues, setFormValues] = useState({
    client: 'RN Construction',
    site: 'Kolhapur Cancer Centre, Kolhapur',
    workType: 'Plane Table',
    totalPoints: '55',
    ratePerPoint: '80',
    baseCharge: '1500',
    extraCharges: '1500',
    discount: '0',
    invoiceDate: new Date().toLocaleDateString('en-GB'),
  })

  const mobileBottomNav = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { label: 'Accounts', path: '/account-manager', icon: Briefcase },
    { label: 'Clients', path: '/clients-sites', icon: UsersRound },
    { label: 'Sites', path: '/site-visits', icon: ClipboardList },
    { label: 'Reports', path: '/reports', icon: FileBarChart },
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
      Reports: '/reports',
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

  const handleGenerateInvoice = async () => {
    const totalPoints = Number(formValues.totalPoints) || 0
    const ratePerPoint = parseMoney(formValues.ratePerPoint)
    const baseCharge = parseMoney(formValues.baseCharge)
    const extraCharges = parseMoney(formValues.extraCharges)
    const discount = parseMoney(formValues.discount)

    await exportInvoicePdf({
      client: formValues.client,
      site: formValues.site,
      workType: formValues.workType,
      totalPoints,
      ratePerPoint,
      baseCharge,
      extraCharges,
      discount,
      invoiceDate: formValues.invoiceDate,
    })
  }

  return (
    <div className="flex h-[100svh] max-h-[100svh] min-h-[100svh] flex-col overflow-hidden bg-black md:h-dvh md:max-h-dvh md:min-h-dvh md:bg-neutral-100">
      <div className="flex min-h-0 flex-1 w-full max-w-none">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[280px] flex-col bg-gradient-to-b from-[#050505] via-[#0b0b0b] to-[#040404] pb-20 text-white lg:flex">
          <div className="px-6 pt-7">
            <CollaborationBrandMark variant="desktopSidebar" />
          </div>
          <nav className="mt-5 flex-1 px-3">
            <div className="space-y-1">
              {navItems.map((item) => {
                if (item.label === 'Account Manager') {
                  return (
                    <Fragment key="account-manager">
                      <AccountManagerSidebarBlock
                        pathname={pathname}
                        onNavigate={onNavigate}
                        onAfterNavigate={() => setIsSidebarOpen(false)}
                      />
                    </Fragment>
                  )
                }
                const active = false
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
          aria-label="Profile"
        >
          <div className="flex items-center justify-between px-5 pt-6">
            <span className="text-sm font-extrabold tracking-tight text-white">Profile</span>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
              aria-label="Close profile"
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
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                <a
                  href="mailto:samarthlandsurveyors@gmail.com"
                  className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-white/90 hover:bg-white/5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f39b03]">
                    <Mail size={15} />
                  </span>
                  <span className="min-w-0 truncate">samarthlandsurveyors@gmail.com</span>
                </a>
                <a
                  href="tel:+918643001010"
                  className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-white/90 hover:bg-white/5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f39b03]">
                    <Phone size={15} />
                  </span>
                  <span>+91 86430 01010</span>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-5 px-5">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-white/45">Quick navigation</div>
            <div className="mt-2 space-y-2">
              <AccountManagerSidebarBlock
                pathname={pathname}
                onNavigate={onNavigate}
                onAfterNavigate={() => setIsSidebarOpen(false)}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
                { label: 'Clients', path: '/clients-sites', icon: UsersRound },
                { label: 'Visits', path: '/site-visits', icon: ClipboardList },
              ].map(({ label, path, icon: Icon }) => (
                <button
                  type="button"
                  key={path}
                  onClick={() => {
                    onNavigate(path)
                    setIsSidebarOpen(false)
                  }}
                  className={[
                    'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[11px] font-bold ring-1 transition',
                    path === '/dashboard'
                      ? 'bg-white/10 text-[#f39b03] ring-[#f39b03]/35'
                      : 'bg-white/5 text-white/85 ring-white/10 hover:bg-white/10',
                  ].join(' ')}
                >
                  <Icon size={18} />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex-1 px-5">
            <button
              type="button"
              onClick={() => handleNavClick('Log Out')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/15 py-3 text-sm font-bold text-red-200 ring-1 ring-red-400/35 hover:bg-red-500/25"
            >
              <LogOut size={18} />
              Log Out
            </button>
          </div>
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
                  <CollaborationBrandMark variant="mobileHeader" />
                </div>
                <button
                  type="button"
                  className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-white ring-1 ring-white/10 transition hover:bg-white/10"
                  aria-label="Notifications"
                >
                  <Bell size={18} strokeWidth={2} className="text-white" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white ring-2 ring-black" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                <h1 className="min-w-0 truncate text-left text-base font-extrabold leading-tight tracking-tight text-white">
                  Invoice
                </h1>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-neutral-900 px-2.5 text-[11px] font-semibold text-white transition hover:bg-neutral-800"
                  aria-label="Current date"
                >
                  <Calendar size={13} className="text-[#f39b03]" />
                  <span className="whitespace-nowrap">{headerDateLabel}</span>
                </button>
              </div>
            </div>

            <div className="relative hidden w-full items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-2.5 shadow-[0_6px_20px_rgba(16,24,40,0.05)] sm:px-6 md:flex md:px-6 md:py-4 lg:px-8">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-neutral-50 md:h-10 md:w-10 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)] lg:hidden"
                  aria-label="Open menu"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu size={18} className="text-neutral-900" />
                </button>
                <div className="min-w-0 truncate text-lg font-extrabold tracking-tight text-neutral-950 sm:text-xl">
                  Invoice
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-900 sm:px-4 sm:py-2.5 sm:text-sm"
                  aria-label="Current date"
                >
                  <Calendar size={16} className="text-[#f39b03]" />
                  <span className="whitespace-nowrap">{headerDateLabel}</span>
                </button>
                <div className="hidden items-center gap-3 rounded-xl bg-neutral-100 px-3 py-2 ring-1 ring-black/5 sm:flex sm:px-4 sm:py-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f39b03]/15 text-[#f39b03]">
                    <CircleUserRound size={18} />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-xs font-extrabold text-neutral-900 sm:text-sm">
                      Er. Shubham Bhoi
                    </div>
                    <div className="text-[11px] font-semibold text-neutral-600">Admin</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-3 pb-[calc(3.65rem+max(10px,env(safe-area-inset-bottom,0px)))] sm:px-5 sm:pt-5 sm:pb-[calc(3.65rem+max(10px,env(safe-area-inset-bottom,0px)))] md:p-6 md:pb-24 lg:p-8 lg:pb-28">
            <section className="mx-auto w-full max-w-[1100px]">
              <CardShell title="Create Invoice">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <div>
                    <FieldLabel label="Client" />
                    <input
                      value={formValues.client}
                      onChange={(e) => updateFormValue('client', e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Site" />
                    <input
                      value={formValues.site}
                      onChange={(e) => updateFormValue('site', e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                    />
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
                  <div className="sm:col-span-2">
                    <FieldLabel label="Invoice Date" />
                    <div className="relative">
                      <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#f39b03]" />
                      <input
                        type="text"
                        value={formValues.invoiceDate}
                        onChange={(e) => updateFormValue('invoiceDate', e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-8 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]"
                        placeholder="DD/MM/YYYY"
                      />
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGenerateInvoice}
                    className="h-11 rounded-xl bg-[#f39b03] px-5 text-sm font-bold text-white"
                  >
                    Generate Invoice (PDF)
                  </button>
                </div>
              </CardShell>
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
            const active = pathname === item.path
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

          <div className="min-w-0 flex-1 justify-end text-right text-[10px] font-bold leading-tight text-white/90 md:hidden">
            <div className="flex items-center justify-end gap-2">
              <Phone size={11} className="text-[#f39b03]" />
              <span>8643 00 1010</span>
              <span className="text-white/55">|</span>
              <Phone size={11} className="text-[#f39b03]" />
              <span>7026 01 6077</span>
            </div>
            <div className="mt-1 flex items-center justify-end gap-2">
              <Phone size={11} className="text-[#f39b03]" />
              <span>95959755566</span>
              <span className="text-white/55">|</span>
              <Phone size={11} className="text-[#f39b03]" />
              <span>7058129002</span>
            </div>
            <div className="mt-1 flex items-center justify-end gap-2">
              <Mail size={11} className="text-[#f39b03]" />
              <span className="truncate">samarthlandsurveyors@gmail.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

