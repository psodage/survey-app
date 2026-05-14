import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CircleUserRound,
  ClipboardList,
  FileBarChart,
  X,
  Gauge,
  IndianRupee,
  LayoutGrid,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  UsersRound,
} from 'lucide-react'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import http from './api/http'
import { useAuth } from './context/AuthContext'
import { AccountManagerSidebarBlock } from './AccountManagerSidebarBlock'
import { CollaborationBrandMark } from './CollaborationBrandMark'
import { LayoutFooter } from './LayoutFooter'
import { CardShell, StatCard } from './dashboardCards'
import { layoutBrandLogo } from './brandLogo'
import { HeaderYearSelect } from './components/HeaderYearSelect'
import { useSelectedYear } from './context/SelectedYearContext'
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
  // { label: 'Reports', icon: <FileBarChart size={16} /> },
  { label: 'Settings', icon: <Building2 size={16} /> },
  { label: 'Log Out', icon: <LogOut size={16} /> },
]

type DashboardProps = {
  onNavigate: (path: string) => void
}

type RecentVisitRow = {
  id: string
  visitMongoId?: string
  site: string
  client: string
  date: string
  amount: string
  machine: string
  paymentMode: string
  paymentStatus: string
  notes: string
  work: string
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { user, token } = useAuth()
  const { selectedYear } = useSelectedYear()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const [recentVisits, setRecentVisits] = useState<RecentVisitRow[]>([])
  const [pendingAmountByClient, setPendingAmountByClient] = useState<[string, string][]>([])
  const [stats, setStats] = useState({
    totalRevenue: '—',
    received: '—',
    pending: '—',
    totalSites: '—',
    totalClients: '—',
  })

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get<{
          ok: boolean
          recentVisits: RecentVisitRow[]
          pendingAmountByClient: [string, string][]
          stats: {
            totalRevenue: string
            received: string
            pending: string
            totalSites: number
            totalClients: number
          }
        }>('/api/dashboard', { params: { year: selectedYear } })
        if (cancelled || !res.data?.ok) return
        setRecentVisits(res.data.recentVisits ?? [])
        setPendingAmountByClient(res.data.pendingAmountByClient ?? [])
        setStats({
          totalRevenue: res.data.stats?.totalRevenue ?? '—',
          received: res.data.stats?.received ?? '—',
          pending: res.data.stats?.pending ?? '—',
          totalSites: String(res.data.stats?.totalSites ?? '—'),
          totalClients: String(res.data.stats?.totalClients ?? '—'),
        })
      } catch {
        /* offline or server down — keep placeholders */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, selectedYear])

  const getVisitDetailsPath = (visit: RecentVisitRow) => {
    const params = new URLSearchParams({
      mode: 'visit',
      visitId: visit.id,
      client: visit.client,
      name: visit.site,
      date: visit.date,
      machine: visit.machine,
      amount: visit.amount,
      paymentMode: visit.paymentMode,
      paymentStatus: visit.paymentStatus,
      notes: visit.notes,
      work: visit.work,
    })
    if (visit.visitMongoId) params.set('visitMongoId', visit.visitMongoId)
    return `/site-details?${params.toString()}`
  }

  const getClientDetailsPath = (clientName: string) => {
    const params = new URLSearchParams({ client: clientName })
    return `/clients-sites?${params.toString()}`
  }

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

  const mobileBottomNav = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { label: 'Accounts', path: '/account-manager', icon: Briefcase },
    { label: 'Clients', path: '/clients-sites', icon: UsersRound },
    { label: 'Sites', path: '/site-visits', icon: MapPin },
    // { label: 'Reports', path: '/reports', icon: FileBarChart },
    { label: 'Settings', path: '/settings', icon: Building2 },
  ] as const

  const handleSummaryCardClick = (summary: 'total-revenue' | 'received' | 'pending' | 'total-sites') => {
    // Use a query param so `ClientsSites` can sort/filter accordingly.
    onNavigate(`/clients-sites?summary=${summary}`)
  }

  return (
    <div className="flex h-[100svh] max-h-[100svh] min-h-[100svh] flex-col overflow-hidden bg-black md:h-dvh md:max-h-dvh md:min-h-dvh md:bg-neutral-100">
      <div className="flex min-h-0 flex-1 w-full max-w-none">
        {/* Sidebar */}
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
                const active = item.label === 'Dashboard'
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
                        isLogout
                          ? 'bg-red-500/18 text-red-300'
                          : active
                          ? 'bg-[#f39b03]/14'
                          : 'bg-white/5',
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
                <div className="mt-3 text-base font-extrabold text-white">Er. {user?.fullName || 'User'}</div>
                <div className="mt-1 text-xs font-semibold text-white/65">{user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}</div>
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
                { label: 'Visits', path: '/site-visits', icon: MapPin },
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

        {/* Main */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-[280px]">
          {/* Header */}
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
                  Dashboard
                </h1>
                <HeaderYearSelect variant="onDark" compact />
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
                  Dashboard
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <HeaderYearSelect variant="onLight" />
                <div className="hidden items-center gap-3 rounded-xl bg-neutral-100 px-3 py-2 ring-1 ring-black/5 sm:flex sm:px-4 sm:py-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f39b03]/15 text-[#f39b03]">
                    <CircleUserRound size={18} />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-xs font-extrabold text-neutral-900 sm:text-sm">
                      {user?.fullName || 'User'}
                    </div>
                    <div className="text-[11px] font-semibold text-neutral-600">
                      {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] sm:px-6 sm:pt-6 sm:pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] md:p-6 md:pb-24 lg:p-8 lg:pb-28">
            {/* Summary cards */}
            <section className="grid grid-cols-2 gap-1.5 md:gap-4 xl:grid-cols-4">
              <button
                type="button"
               
                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                aria-label="Open Total Revenue records"
              >
                <StatCard
                  title="Total Revenue"
                  value={stats.totalRevenue}
                  subtitle="This Financial Year"
                  icon={<IndianRupee size={20} className="text-emerald-600" />}
                  toneClass="bg-emerald-100"
                  mobileCardTint="bg-emerald-50/90"
                />
              </button>
              <button
                type="button"
            
                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                aria-label="Open Received Amount records"
              >
                <StatCard
                  title="Received Amount"
                  value={stats.received}
                  subtitle="This Financial Year"
                  icon={<Gauge size={20} className="text-sky-600" />}
                  toneClass="bg-sky-100"
                  mobileCardTint="bg-sky-50/90"
                />
              </button>
              <button
                type="button"

                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                aria-label="Open Pending Amount records"
              >
                <StatCard
                  title="Pending Amount"
                  value={stats.pending}
                  subtitle="This Financial Year"
                  icon={<BarChart3 size={20} className="text-rose-600" />}
                  toneClass="bg-rose-100"
                  mobileCardTint="bg-rose-50/90"
                />
              </button>
              <button
                type="button"
          
                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                aria-label="Open Total Sites records"
              >
                <StatCard
                  title="Total Sites"
                  value={stats.totalSites}
                  subtitle="All Sites"
                  icon={<Building2 size={20} className="text-neutral-700 md:text-[#f39b03]" />}
                  toneClass="bg-neutral-200 md:bg-[#f39b03]/12"
                  mobileCardTint="bg-neutral-900/[0.07]"
                />
              </button>
            </section>

            {/* Quick Actions */}
            <section className="mt-4 md:mt-6">
              <CardShell title="Quick Actions">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {[
                    { title: 'Add Site', path: '/clients-sites', icon: <Building2 size={18} /> },
                    { title: 'Add Site Visit', path: '/site-visits', icon: <ClipboardList size={18} /> },
                    { title: 'View Clients', path: '/clients-sites', icon: <UsersRound size={18} /> },
                  ].map((a) => (
                    <button
                      key={a.title}
                      type="button"
                      onClick={() => onNavigate(a.path)}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-2.5 py-2 text-left shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:shadow-[0_16px_40px_rgba(16,24,40,0.08)] md:gap-4 md:rounded-2xl md:px-5 md:py-4 md:shadow-[0_10px_30px_rgba(16,24,40,0.04)] md:ring-0"
                    >
                      <div className="flex min-w-0 items-center gap-2 md:gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] md:h-11 md:w-11 md:rounded-2xl">
                          {a.icon}
                        </div>
                        <div className="truncate text-xs font-extrabold text-neutral-900 md:text-sm">
                          {a.title}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-neutral-900 px-2 py-1 text-[10px] font-bold text-white transition group-hover:bg-[#f39b03] md:rounded-xl md:px-3 md:py-2 md:text-xs">
                        Open
                      </span>
                    </button>
                  ))}
                </div>
              </CardShell>
            </section>

            {/* Bottom content */}
            <section className="mt-4 grid grid-cols-1 gap-4 md:mt-6 md:gap-5 xl:grid-cols-2">
              <CardShell
                title="Recent Site Visits"
                action={
                  <button type="button" onClick={() => onNavigate('/site-visits')}>
                    View All
                  </button>
                }
              >
                <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 md:block">
                  <table className="w-full border-collapse">
                    <thead className="bg-neutral-50">
                      <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                        <th className="px-4 py-3">Site Name</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Visit Date</th>
                        <th className="px-4 py-3">Pay status</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-semibold text-neutral-800">
                      {recentVisits.map((visit) => (
                        <tr
                          key={visit.id}
                          className="cursor-pointer border-t border-neutral-200 hover:bg-neutral-50/70"
                          onClick={() => onNavigate(getVisitDetailsPath(visit))}
                        >
                          <td className="px-4 py-3 font-extrabold text-neutral-900">
                            {visit.site}
                          </td>
                          <td className="px-4 py-3 text-neutral-700">{visit.client}</td>
                          <td className="px-4 py-3 text-neutral-700">{visit.date}</td>
                          <td className="px-4 py-3 text-neutral-700">{visit.paymentStatus}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-neutral-900">
                            ₹{visit.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="flex flex-col gap-1.5 md:hidden">
                  {recentVisits.map((visit) => (
                    <li key={`${visit.id}-mobile`}>
                      <button
                        type="button"
                        onClick={() => onNavigate(getVisitDetailsPath(visit))}
                        className="w-full rounded-lg bg-white px-2 py-1.5 text-left shadow-sm ring-1 ring-black/5"
                      >
                        <div className="truncate text-xs font-bold text-neutral-900">{visit.site}</div>
                        <div className="mt-0.5 truncate text-[10px] font-semibold text-neutral-600">
                          {visit.client}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold text-neutral-500">
                          <span>
                            {visit.date} · {visit.paymentStatus}
                          </span>
                          <span className="shrink-0 text-xs font-extrabold text-neutral-900">₹{visit.amount}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardShell>

              <CardShell
                title="Pending Amount by Client"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate('/account-manager?view=pending')
                    }
                  >
                    View All
                  </button>
                }
              >
                <ul className="flex flex-col gap-1.5 md:gap-3">
                  {pendingAmountByClient.map(([name, amt]) => (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => onNavigate(getClientDetailsPath(name))}
                        className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-left shadow-sm ring-1 ring-black/5 transition hover:bg-neutral-50 md:rounded-2xl md:border md:border-neutral-200 md:px-4 md:py-3 md:shadow-[0_10px_30px_rgba(16,24,40,0.04)] md:ring-0"
                      >
                        <div className="flex min-w-0 items-center gap-2 md:gap-3">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] md:h-10 md:w-10 md:rounded-2xl">
                            <IndianRupee size={18} />
                          </div>
                          <div className="truncate text-xs font-extrabold text-neutral-900 md:text-sm">
                            {name}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs font-extrabold text-neutral-900 md:text-sm">{amt}</div>
                      </button>
                    </li>
                  ))}
                </ul>
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
            const active = item.path === '/dashboard'
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

      <LayoutFooter />
    </div>
  )
}

