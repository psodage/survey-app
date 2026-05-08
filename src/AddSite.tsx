import {
  ArrowLeft,
  Bell,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  CircleUserRound,
  ClipboardList,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { signOut } from './signOut'

type AddSiteProps = {
  onNavigate: (path: string) => void
}

const clientOptions = [
  'Amit Developers',
  'Shree Krishna Infra',
  'Vishwakarma Properties',
  'Gajanan Projects',
]

function parseAmount(value: string) {
  return Number(value.replace(/[^\d.-]/g, '')) || 0
}

export default function AddSite({ onNavigate }: AddSiteProps) {
  const location = useLocation()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const clientFromQuery = searchParams.get('client')
  const initialClient =
    clientFromQuery && clientOptions.includes(clientFromQuery) ? clientFromQuery : clientOptions[0]

  const [client] = useState(initialClient)
  const [siteName, setSiteName] = useState('')
  const [locationName, setLocationName] = useState('')
  const [status, setStatus] = useState<'Active' | 'On Hold' | 'Completed'>('Active')
  const [pendingAmount, setPendingAmount] = useState('')
  const [totalPoints, setTotalPoints] = useState('')
  const [ratePerPoint, setRatePerPoint] = useState('')
  const [baseCharge, setBaseCharge] = useState('')
  const [extraCharges, setExtraCharges] = useState('')
  const [discount, setDiscount] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const calculatedTotalAmount = useMemo(() => {
    const points = parseAmount(totalPoints)
    const rate = parseAmount(ratePerPoint)
    const base = parseAmount(baseCharge)
    const extra = parseAmount(extraCharges)
    const discountValue = parseAmount(discount)
    return Math.max(0, base + points * rate + extra - discountValue)
  }, [baseCharge, discount, extraCharges, ratePerPoint, totalPoints])

  const mobileBottomNav: { label: string; path: string; icon: LucideIcon }[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { label: 'Accounts', path: '/account-manager', icon: Briefcase },
    { label: 'Clients', path: '/clients-sites', icon: UsersRound },
    { label: 'Sites', path: '/site-visits', icon: MapPin },
    { label: 'Measurement', path: '/measurement-rate-calculator', icon: Calculator },
    { label: 'Settings', path: '/settings', icon: Building2 },
  ]

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

  const navItems = [
    { label: 'Dashboard', icon: <LayoutGrid size={16} /> },
    { label: 'Account Manager', icon: <Briefcase size={16} /> },
    { label: 'Clients & Sites', icon: <UsersRound size={16} /> },
    { label: 'Site Visits', icon: <ClipboardList size={16} /> },
    { label: 'Measurement', icon: <Calculator size={16} /> },
    { label: 'Settings', icon: <Building2 size={16} /> },
    { label: 'Log Out', icon: <LogOut size={16} /> },
  ]

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
                const active = item.label === 'Clients & Sites'
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
                    <span className={['grid h-8 w-8 place-items-center rounded-lg', isLogout ? 'bg-red-500/18 text-red-300' : active ? 'bg-[#f39b03]/14' : 'bg-white/5'].join(' ')}>
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
                <button type="button" className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15" onClick={() => setIsSidebarOpen(true)}>
                  <Menu size={18} strokeWidth={2.25} className="text-white" />
                </button>
                <div className="flex min-w-0 justify-center px-1">
                  <img src="/samarth-logo.png" alt="Samarth Land Surveyors" className="h-14 max-h-[68px] w-auto max-w-full object-contain object-center" draggable={false} />
                </div>
                <button type="button" className="relative grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-white ring-1 ring-white/10" aria-label="Notifications">
                  <Bell size={18} strokeWidth={2} className="text-white" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white ring-2 ring-black" />
                </button>
              </div>
            </div>
            <div className="relative hidden w-full items-center justify-between gap-4 border-b border-neutral-200 bg-white px-6 py-4 md:flex lg:px-8">
              <div className="truncate text-lg font-extrabold tracking-tight text-neutral-950 sm:text-xl">Add New Site</div>
              <div className="flex shrink-0 items-center gap-3">
                <button type="button" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-neutral-900">
                  <Calendar size={16} className="text-[#f39b03]" />
                  <span className="whitespace-nowrap">20 May 2025</span>
                </button>
                <div className="hidden items-center gap-3 rounded-xl bg-neutral-100 px-4 py-2.5 ring-1 ring-black/5 sm:flex">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f39b03]/15 text-[#f39b03]"><CircleUserRound size={18} /></div>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-sm font-extrabold text-neutral-900">Er. Shubham Bhoi</div>
                    <div className="text-[11px] font-semibold text-neutral-600">Admin</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 pb-24 sm:px-6 sm:pt-6 md:p-6 lg:p-8">
            <div className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.06)] ring-1 ring-black/5 md:p-8">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-neutral-200 pb-4">
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-950 md:text-2xl">Add New Site</h1>
                  <p className="mt-1 text-sm font-semibold text-neutral-500">Create a new site under a client.</p>
                </div>
                <button type="button" onClick={() => onNavigate('/clients-sites')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-800 transition hover:bg-neutral-50">
                  <ArrowLeft size={14} />
                  Back
                </button>
              </div>

              <form
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  onNavigate('/clients-sites')
                }}
              >
          <label className="grid gap-2">
            <span className="text-xs font-bold text-neutral-700">Client</span>
            <input
              value={client}
              readOnly
              className="h-11 rounded-xl border border-neutral-200 bg-neutral-100 px-3 text-sm font-semibold text-neutral-900 outline-none"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold text-neutral-700">Site Name</span>
            <input
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              required
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
              placeholder="e.g. Sai Residency Phase 3"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold text-neutral-700">Location</span>
            <input
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              required
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
              placeholder="e.g. Baner"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold text-neutral-700">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'Active' | 'On Hold' | 'Completed')}
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
            >
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-bold text-neutral-700">Pending Amount (optional)</span>
            <input
              value={pendingAmount}
              onChange={(event) => setPendingAmount(event.target.value)}
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
              placeholder="e.g. 25000"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold text-neutral-700">Total Points</span>
            <input
              value={totalPoints}
              onChange={(event) => setTotalPoints(event.target.value)}
              inputMode="numeric"
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
              placeholder="0"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold text-neutral-700">Rate Per Point (₹)</span>
            <input
              value={ratePerPoint}
              onChange={(event) => setRatePerPoint(event.target.value)}
              inputMode="numeric"
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
              placeholder="0"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold text-neutral-700">Base Charge (₹)</span>
            <input
              value={baseCharge}
              onChange={(event) => setBaseCharge(event.target.value)}
              inputMode="numeric"
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
              placeholder="0"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold text-neutral-700">Extra Charges (₹)</span>
            <input
              value={extraCharges}
              onChange={(event) => setExtraCharges(event.target.value)}
              inputMode="numeric"
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
              placeholder="0"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold text-neutral-700">Discount (₹)</span>
            <input
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              inputMode="numeric"
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
              placeholder="0"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-bold text-neutral-700">Total Amount (₹)</span>
            <input
              value={calculatedTotalAmount.toLocaleString('en-IN')}
              readOnly
              className="h-11 rounded-xl border border-[#f39b03]/30 bg-[#f39b03]/5 px-3 text-sm font-extrabold text-[#b56d00] outline-none"
            />
            <p className="text-[11px] font-semibold text-neutral-500">
              Base Charge + (Total Points × Rate Per Point) + Extra Charges - Discount
            </p>
          </label>

          <div className="mt-2 flex items-center gap-3 md:col-span-2">
            <button
              type="button"
              onClick={() => onNavigate('/clients-sites')}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 text-sm font-extrabold text-neutral-800 transition hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f39b03] px-8 text-sm font-extrabold text-white transition hover:bg-[#e18e03]"
            >
              Save Site
            </button>
          </div>
              </form>
            </div>
          </div>
        </main>
      </div>

      {isSidebarOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-label="Close sidebar overlay" onClick={() => setIsSidebarOpen(false)} />
      ) : null}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-y-auto bg-gradient-to-b from-[#050505] via-[#0b0b0b] to-[#040404] pb-20 text-white transition-transform duration-300 lg:hidden',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <img src="/samarth-logo.png" alt="Samarth Land Surveyors" className="h-10 w-auto" draggable={false} />
          <button type="button" className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20" onClick={() => setIsSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex w-full flex-col border-t border-white/10 bg-black md:hidden" aria-label="Mobile primary navigation">
        <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-0 px-1 pt-1.5 pb-1">
          {mobileBottomNav.map((item) => {
            const active = item.path === '/clients-sites'
            const Icon = item.icon
            return (
              <button type="button" key={item.path} onClick={() => onNavigate(item.path)} className={['flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold transition', active ? 'text-[#f39b03]' : 'text-white/50 hover:text-white/80'].join(' ')}>
                <span className={['grid h-8 w-8 place-items-center rounded-lg transition', active ? 'bg-[#f39b03]/20 text-[#f39b03]' : 'bg-white/5 text-white/55'].join(' ')}>
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
          <div className="min-w-0 flex-1 text-right text-[11px] font-bold text-white/90">Samarth Land Surveyors</div>
        </div>
      </footer>
    </div>
  )
}
