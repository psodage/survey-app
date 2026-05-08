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

export default function MeasurementRateCalculator({ onNavigate }: MeasurementRateCalculatorProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()

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
                  Measurement &amp; Rate Calculator
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
                  <span>20 May 2025</span>
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
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
                  Measurement &amp; Rate Calculator
                </h1>
              </div>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f39b03] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(243,155,3,0.35)] transition hover:brightness-95 sm:h-auto sm:py-2.5"
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
                  <select className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]">
                    <option>Select client</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Site" />
                  <select className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]">
                    <option>Select site</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Machine Type" />
                  <select className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]">
                    <option>Total Station</option>
                    <option>DGPS</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Work Type" />
                  <select className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]">
                    <option>Plane Table</option>
                    <option>P.T. &amp; Contour</option>
                    <option>Stake Out</option>
                    <option>Line Out</option>
                    <option>Excavation Points</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Total Points" />
                  <input className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]" placeholder="0" />
                </div>
                <div>
                  <FieldLabel label="Rate Per Point" />
                  <input className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]" placeholder="₹ 0" />
                </div>
                <div>
                  <FieldLabel label="Base Charge" />
                  <input className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]" placeholder="₹ 0" />
                </div>
                <div>
                  <FieldLabel label="Extra Charges" />
                  <input className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]" placeholder="₹ 0" />
                </div>
                <div>
                  <FieldLabel label="Discount" />
                  <input className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#f39b03]" placeholder="₹ 0" />
                </div>
                <div>
                  <FieldLabel label="Measurement Date" />
                  <button
                    type="button"
                    className="relative flex w-full items-center rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700"
                  >
                    <Calendar size={16} className="mr-2 text-[#f39b03]" />
                    Select date
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2" />
                  </button>
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
                    className="h-11 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-700"
                  >
                    Reset
                  </button>
                  <button type="button" className="h-11 rounded-xl bg-neutral-900 px-4 text-sm font-bold text-white">
                    Save Measurement
                  </button>
                  <button type="button" className="h-11 rounded-xl bg-[#f39b03] px-4 text-sm font-bold text-white">
                    Generate Invoice
                  </button>
                </div>
              </section>

              <section className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:mt-6 md:rounded-2xl md:p-6 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-extrabold tracking-tight text-neutral-900 md:text-lg">Rate Master</h2>
                </div>
                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full min-w-[860px] border-collapse">
                  <thead className="bg-neutral-50">
                    <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                      <th className="px-4 py-3">Machine Type</th>
                      <th className="px-4 py-3">Work Type</th>
                      <th className="px-4 py-3">Rate Per Point</th>
                      <th className="px-4 py-3">Base Charge</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-semibold text-neutral-800">
                    {[
                      ['DGPS', 'Excavation Points', '₹50', '₹5,000', 'Active'],
                      ['Total Station', 'Layout Survey', '₹40', '₹3,000', 'Active'],
                      ['DGPS', 'Contour Survey', '₹60', '₹6,000', 'Active'],
                    ].map(([machine, work, rate, base, status]) => (
                      <tr key={`${machine}-${work}`} className="border-t border-neutral-200">
                        <td className="px-4 py-3 font-extrabold text-neutral-900">{machine}</td>
                        <td className="px-4 py-3">{work}</td>
                        <td className="px-4 py-3">{rate}</td>
                        <td className="px-4 py-3">{base}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" className="text-sm font-bold text-[#f39b03] hover:underline">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </section>

              <section className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:mt-6 md:rounded-2xl md:p-6 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
                <h2 className="text-base font-extrabold tracking-tight text-neutral-900 md:text-lg">Recent Measurements</h2>
                <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full min-w-[900px] border-collapse">
                  <thead className="bg-neutral-50">
                    <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Site</th>
                      <th className="px-4 py-3">Machine</th>
                      <th className="px-4 py-3">Points</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-semibold text-neutral-800">
                    {[
                      ['22 May 2025', 'Amit Developers', 'Sai Residency', 'DGPS', '120', '₹11,000', 'Pending'],
                      ['21 May 2025', 'Vishwakarma Properties', 'Sunrise Enclave', 'Total Station', '95', '₹7,800', 'Paid'],
                      ['20 May 2025', 'Shree Krishna Infra', 'Green Valley', 'DGPS', '140', '₹13,400', 'Pending'],
                    ].map(([date, client, site, machine, points, amount, status]) => (
                      <tr key={`${date}-${client}`} className="border-t border-neutral-200">
                        <td className="px-4 py-3">{date}</td>
                        <td className="px-4 py-3 font-extrabold text-neutral-900">{client}</td>
                        <td className="px-4 py-3">{site}</td>
                        <td className="px-4 py-3">{machine}</td>
                        <td className="px-4 py-3">{points}</td>
                        <td className="px-4 py-3 font-extrabold text-neutral-900">{amount}</td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              'rounded-full px-2.5 py-1 text-xs font-bold',
                              status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700',
                            ].join(' ')}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
