import {
  ArrowLeft,
  Briefcase,
  Building2,
  CircleUserRound,
  ClipboardList,
  FileBarChart,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AccountManagerSidebarBlock } from './AccountManagerSidebarBlock'
import { AddSiteForm, DEFAULT_CLIENT_OPTIONS_FOR_ADD_SITE } from './AddSiteForm'
import { CollaborationBrandMark } from './CollaborationBrandMark'
import { LayoutFooter } from './LayoutFooter'
import { CardPanel, toolbarSearchInputClass, toolbarSecondaryButtonClass } from './dashboardCards'
import { layoutBrandLogo } from './brandLogo'
import { AppSelect } from './components/AppSelect'
import { HeaderYearSelect } from './components/HeaderYearSelect'
import { PageRefreshButton } from './components/PageRefreshButton'
import { useRefresh } from './context/RefreshContext'
import { toast } from 'sonner'
import http from './api/http'
import { useAuth } from './context/AuthContext'
import { useSelectedYear } from './context/SelectedYearContext'
import { signOut } from './signOut'

type AddSiteProps = {
  onNavigate: (path: string) => void
}

export default function AddSite({ onNavigate }: AddSiteProps) {
  const { token, activeInstrumentId } = useAuth()
  const { selectedYear } = useSelectedYear()
  const { refreshTick } = useRefresh()
  const location = useLocation()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const clientFromQuery = searchParams.get('client')
  const [clientNames, setClientNames] = useState<string[]>([...DEFAULT_CLIENT_OPTIONS_FOR_ADD_SITE])
  const [clientIds, setClientIds] = useState<Record<string, string>>({})

  const [selectedClient, setSelectedClient] = useState(() => clientFromQuery ?? DEFAULT_CLIENT_OPTIONS_FOR_ADD_SITE[0])
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [clientGroupFilter, setClientGroupFilter] = useState<'all' | 'a-m' | 'n-z'>('all')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const res = await http.get<{ ok: boolean; clients: Array<{ id: string; name: string }> }>('/api/clients', {
          params: { year: selectedYear, ...(activeInstrumentId ? { instrumentId: activeInstrumentId } : {}) },
        })
        if (!res.data?.ok) return
        const ids: Record<string, string> = {}
        const names = res.data.clients.map((c) => {
          ids[c.name] = c.id
          return c.name
        })
        if (names.length) {
          setClientIds(ids)
          setClientNames(names)
          setSelectedClient((prev) => {
            if (clientFromQuery && names.includes(clientFromQuery)) return clientFromQuery
            if (names.includes(prev)) return prev
            return names[0]
          })
        }
      } catch {
        toast.error('Could not load clients')
      }
    })()
  }, [token, clientFromQuery, selectedYear, refreshTick, activeInstrumentId])

  const filteredClientOptions = useMemo(() => {
    const normalizedQuery = clientSearchQuery.trim().toLowerCase()
    return clientNames.filter((clientName) => {
      const firstChar = clientName.trim().charAt(0).toLowerCase()
      const matchesGroup =
        clientGroupFilter === 'all' ||
        (clientGroupFilter === 'a-m' && firstChar >= 'a' && firstChar <= 'm') ||
        (clientGroupFilter === 'n-z' && firstChar >= 'n' && firstChar <= 'z')
      const matchesQuery = normalizedQuery.length === 0 || clientName.toLowerCase().includes(normalizedQuery)
      return matchesGroup && matchesQuery
    })
  }, [clientGroupFilter, clientSearchQuery, clientNames])

  const mobileBottomNav: { label: string; path: string; icon: LucideIcon }[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { label: 'Accounts', path: '/account-manager', icon: Briefcase },
    { label: 'Clients', path: '/clients-sites', icon: UsersRound },
    { label: 'Sites', path: '/site-visits', icon: MapPin },
    // { label: 'Reports', path: '/reports', icon: FileBarChart },
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
      Reports: '/reports',
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
    // { label: 'Reports', icon: <FileBarChart size={16} /> },
    { label: 'Settings', icon: <Building2 size={16} /> },
    { label: 'Log Out', icon: <LogOut size={16} /> },
  ]

  return (
    <div className="app-layout-root flex flex-col overflow-hidden bg-black md:h-dvh md:max-h-dvh md:min-h-dvh md:bg-neutral-100">
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
                        onNavigate={onNavigate}
                        onAfterNavigate={() => setIsSidebarOpen(false)}
                      />
                    </Fragment>
                  )
                }
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
                  <CollaborationBrandMark variant="mobileHeader" />
                </div>
                <PageRefreshButton variant="onDark" />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                <h1 className="min-w-0 truncate text-left text-base font-extrabold leading-tight tracking-tight text-white">
                  Add New Site
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
                <div className="truncate text-lg font-extrabold tracking-tight text-neutral-950 sm:text-xl">Add New Site</div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <PageRefreshButton variant="onLight" />
                <HeaderYearSelect variant="onLight" />
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
            <CardPanel className="mx-auto max-w-3xl p-4 md:p-8">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-neutral-200 pb-4">
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-950 md:text-2xl">Add New Site</h1>
                  <p className="mt-1 text-sm font-semibold text-neutral-500">
                    Capture the site basics here; visits, reports, and invoices follow from site visit entries.
                  </p>
                </div>
                <button type="button" onClick={() => onNavigate('/clients-sites')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-800 transition hover:bg-neutral-50">
                  <ArrowLeft size={14} />
                  Back
                </button>
              </div>

              <div className="mb-5 grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 md:grid-cols-[minmax(0,1fr)_190px]">
                <input
                  value={clientSearchQuery}
                  onChange={(event) => setClientSearchQuery(event.target.value)}
                  type="text"
                  placeholder="Search client..."
                  className={toolbarSearchInputClass}
                />
                <AppSelect
                  value={clientGroupFilter}
                  onChange={(v) => setClientGroupFilter(v as 'all' | 'a-m' | 'n-z')}
                  className={[toolbarSecondaryButtonClass, 'min-w-[8rem]'].join(' ')}
                  aria-label="Filter clients by alphabet range"
                  options={[
                    { value: 'all', label: 'All Clients' },
                    { value: 'a-m', label: 'A to M' },
                    { value: 'n-z', label: 'N to Z' },
                  ]}
                />
                <div className="md:col-span-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-bold text-neutral-700">Selected Client</span>
                    <AppSelect
                      value={selectedClient}
                      onChange={setSelectedClient}
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus-within:border-[#f39b03]/80 focus-within:ring-2 focus-within:ring-[#f39b03]/20"
                      options={
                        filteredClientOptions.length > 0
                          ? filteredClientOptions.map((clientName) => ({ value: clientName, label: clientName }))
                          : [{ value: selectedClient, label: 'No matching clients', disabled: true }]
                      }
                    />
                  </label>
                </div>
              </div>

              <AddSiteForm
                clientName={selectedClient}
                variant="page"
                onCancel={() => onNavigate('/clients-sites')}
                onSuccess={() => onNavigate('/clients-sites')}
                saveSite={async (siteName, locationName) => {
                  const cid = clientIds[selectedClient]
                  if (!cid) {
                    toast.error('Client not ready. Try again in a moment.')
                    throw new Error('no client id')
                  }
                  const res = await http.post<{ ok: boolean; error?: string }>('/api/sites', {
                    clientId: cid,
                    name: siteName,
                    locationLabel: locationName,
                  })
                  if (res.status !== 201 || !res.data?.ok) {
                    toast.error(res.data?.error ?? 'Could not save site')
                    throw new Error('save failed')
                  }
                  toast.success('Site saved')
                }}
              />
            </CardPanel>
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
          <img src={layoutBrandLogo} alt="Samarth Land Surveyors" className="h-10 w-auto" draggable={false} />
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
              if (item.label === 'Account Manager') {
                return (
                  <Fragment key="account-manager-mobile">
                    <AccountManagerSidebarBlock
                      pathname={location.pathname}
                      onNavigate={onNavigate}
                      onAfterNavigate={() => setIsSidebarOpen(false)}
                    />
                  </Fragment>
                )
              }
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

      <LayoutFooter />
    </div>
  )
}
