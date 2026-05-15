import {
  Briefcase,
  Building2,
  CircleUserRound,
  FileBarChart,
  FileText,
  LayoutGrid,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  UsersRound,
  X,
  ArrowRight,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useSearchParams, type NavigateFunction } from 'react-router-dom'
import { AccountManagerSidebarBlock } from './AccountManagerSidebarBlock'
import { ACCOUNT_MANAGERS } from './accountManagersData'
import http from './api/http'
import { useAuth } from './context/AuthContext'
import { CollaborationBrandMark } from './CollaborationBrandMark'
import { LayoutFooter } from './LayoutFooter'
import { CardPanel } from './dashboardCards'
import { HeaderYearSelect } from './components/HeaderYearSelect'
import { PageRefreshButton } from './components/PageRefreshButton'
import { useRefresh } from './context/RefreshContext'
import { signOut } from './signOut'

type NavItem = {
  label: string
  icon: ReactNode
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutGrid size={16} /> },
  { label: 'Account Manager', icon: <Briefcase size={16} /> },
  { label: 'Clients & Sites', icon: <UsersRound size={16} /> },
  { label: 'Site Visits', icon: <FileText size={16} /> },
  // { label: 'Reports', icon: <FileBarChart size={16} /> },
  { label: 'Settings', icon: <Building2 size={16} /> },
  { label: 'Log Out', icon: <LogOut size={16} /> },
]

type AccountManagerSelectProps = {
  onNavigate: NavigateFunction
}

type PickRow = {
  id: string
  name: string
  shortName: string
  phone: string
  /** Other admin's ledger — browse only */
  viewOnly?: boolean
}

type InstrumentPeerAm = {
  adminId: string
  accountManagerSlug: string | null
  fullName: string
  shortName: string
  phone: string
  email: string
}

export default function AccountManagerSelect({ onNavigate }: AccountManagerSelectProps) {
  const { managers, token, activeInstrumentId, user } = useAuth()
  const { refreshTick } = useRefresh()
  const [instrumentAdmins, setInstrumentAdmins] = useState<InstrumentPeerAm[]>([])

  useEffect(() => {
    if (!token || !activeInstrumentId) {
      setInstrumentAdmins([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get<{ ok: boolean; admins: InstrumentPeerAm[] }>('/api/instruments/coworkers', {
          params: { instrumentId: activeInstrumentId },
        })
        if (cancelled) return
        if (res.data?.ok) setInstrumentAdmins(res.data.admins ?? [])
        else setInstrumentAdmins([])
      } catch {
        if (!cancelled) setInstrumentAdmins([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, activeInstrumentId, refreshTick])

  const pickList = useMemo((): PickRow[] => {
    const fromInstrument = instrumentAdmins
      .filter((a) => a.accountManagerSlug)
      .map((a) => ({
        id: a.accountManagerSlug as string,
        name: a.fullName || a.email || 'Account manager',
        shortName: a.shortName || a.fullName || '—',
        phone: a.phone,
        viewOnly: Boolean(user?.id && a.adminId !== user.id),
      }))
    if (fromInstrument.length > 0) return fromInstrument
    return managers.length
      ? managers.map((m) => ({ id: m.id, name: m.name, shortName: m.shortName, phone: m.phone }))
      : ACCOUNT_MANAGERS.map((m) => ({ id: m.id, name: m.name, shortName: m.shortName, phone: m.phone }))
  }, [instrumentAdmins, managers, user?.id])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const querySuffix = searchParams.toString() ? `?${searchParams.toString()}` : ''

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

  const pickManager = (id: string) => {
    onNavigate(`/account-manager/${id}${querySuffix}`)
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
                        pathname={location.pathname}
                        onNavigate={(path) => onNavigate(path)}
                        onAfterNavigate={() => setIsSidebarOpen(false)}
                      />
                    </Fragment>
                  )
                }
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
                        : 'text-white/85 hover:bg-white/5 hover:text-white',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'grid h-8 w-8 place-items-center rounded-lg',
                        isLogout ? 'bg-red-500/18 text-red-300' : 'bg-white/5',
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
            aria-label="Close panel overlay"
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
                pathname={location.pathname}
                onNavigate={(path) => onNavigate(path)}
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
                  className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[11px] font-bold ring-1 ring-white/10 transition bg-white/5 text-white/85 hover:bg-white/10"
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
                <PageRefreshButton variant="onDark" />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                <h1 className="min-w-0 truncate text-left text-base font-extrabold leading-tight tracking-tight text-white">
                  Account manager
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
                  Account manager
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <PageRefreshButton variant="onLight" />
                <HeaderYearSelect variant="onLight" />
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
            <p className="text-sm font-semibold text-neutral-600 md:text-base">
              Select an account manager to open their ledger and transactions. You can switch again anytime from that
              page.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {pickList.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickManager(m.id)}
                  className="group flex w-full flex-col gap-2.5 rounded-2xl border border-neutral-200 bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70 sm:gap-3 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f39b03]/12 text-sm font-extrabold text-[#c97702] ring-1 ring-[#f39b03]/25">
                      {m.shortName
                        .split(/\s+/)
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <ArrowRight
                      size={20}
                      className="shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-[#f39b03]"
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-base font-extrabold text-neutral-950 sm:text-lg">{m.name}</div>
                      {m.viewOnly ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/90">
                          View only
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-neutral-600">{m.phone}</div>
                  </div>
                  <span className="text-xs font-bold text-[#f39b03]">
                    {m.viewOnly ? 'Open ledger (view only) →' : 'Open account manager page →'}
                  </span>
                </button>
              ))}
            </div>
            {querySuffix ? (
              <CardPanel className="mt-6 p-4">
                <p className="text-xs font-semibold text-neutral-600">
                  After you choose a manager, the app will keep your current view filter from the URL.
                </p>
              </CardPanel>
            ) : null}
          </div>
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex w-full flex-col border-t border-white/10 bg-black [transform:translate3d(0,0,0)] md:hidden"
        aria-label="Mobile primary navigation"
      >
        <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-0 px-1 pt-1.5 pb-1">
          {mobileBottomNav.map((item) => {
            const active = item.path === '/account-manager' ? location.pathname === '/account-manager' : location.pathname === item.path
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
