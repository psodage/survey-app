import {
  ArrowRight,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardList,
  CircleUserRound,
  Eye,
  FileBarChart,
  ImagePlus,
  LogOut,
  MapPin,
  Menu,
  Plus,
  UsersRound,
  LayoutGrid,
  Mail,
  Phone,
  X,
} from 'lucide-react'
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AccountManagerSidebarBlock } from './AccountManagerSidebarBlock'
import { CollaborationBrandMark } from './CollaborationBrandMark'
import { LayoutFooter } from './LayoutFooter'
import {
  CardPanel,
  CardShell,
  StatCard,
  toolbarPlusIconClass,
  toolbarPrimaryButtonClass,
  toolbarSearchInputClass,
  toolbarSecondaryButtonClass,
} from './dashboardCards'
import { layoutBrandLogo } from './brandLogo'
import { getHeaderDateLabel } from './headerDateLabel'
import { toast } from 'sonner'
import http from './api/http'
import { useAuth } from './context/AuthContext'
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

function machineLabelFromSite(site: { instrumentName?: string; instrumentCategory?: string } | undefined): string {
  if (!site) return 'Total Station'
  const cat = (site.instrumentCategory ?? '').toLowerCase()
  if (cat.includes('total station')) return 'Total Station'
  if (cat.includes('auto level') || (cat.includes('level') && !cat.includes('total'))) return 'Auto Level'
  if (cat.includes('drone')) return 'Drone Survey'
  if (cat.includes('gps') || cat.includes('gnss') || cat.includes('dgps')) return 'GPS / GNSS'
  const name = (site.instrumentName ?? '').trim()
  return name || 'Total Station'
}

type PendingVisitPhoto = { id: string; src: string; file: File }

const initialPhotos: PendingVisitPhoto[] = []

type VisitRecord = {
  id: string
  _id?: string
  visitMongoId?: string
  client: string
  site: string
  date: string
  machine: string
  work: string
  amount: string
  paymentMode: string
  paymentStatus: string
  notes: string
  photoUrls?: string[]
}

type ApiSite = {
  id: string
  clientName: string
  name: string
  instrumentName?: string
  instrumentCategory?: string
}

type AddSiteVisitProps = {
  onNavigate: (path: string) => void
}

export default function AddSiteVisit({ onNavigate }: AddSiteVisitProps) {
  const { token, user } = useAuth()
  const { pathname, search } = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const headerDateLabel = getHeaderDateLabel()
  const [clientOptions, setClientOptions] = useState<string[]>([])
  const [sitesByClient, setSitesByClient] = useState<Record<string, string[]>>({})
  const [apiSites, setApiSites] = useState<ApiSite[]>([])
  const [visitRecords, setVisitRecords] = useState<VisitRecord[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [client, setClient] = useState('')
  const [site, setSite] = useState('')
  const [visitDate] = useState(() => getHeaderDateLabel())
  const [machine, setMachine] = useState('Total Station')
  const [engineerName, setEngineerName] = useState('')
  const [billingParticular, setBillingParticular] = useState('')
  const [billingQuantity, setBillingQuantity] = useState('1')
  const [billingRate, setBillingRate] = useState('80')
  const [billingOtherCharges, setBillingOtherCharges] = useState('0')
  const [workDetails, setWorkDetails] = useState(
    'Topographic survey for layout planning',
  )
  const [notes, setNotes] = useState('Completed boundary points and levels.')
  const [photos, setPhotos] = useState<PendingVisitPhoto[]>(initialPhotos)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formId = useId()
  const searchParams = useMemo(() => new URLSearchParams(search), [search])
  const mode = searchParams.get('mode')
  const requestedClient = searchParams.get('client')
  const requestedSiteName = searchParams.get('name')

  const loadData = useCallback(async () => {
    if (!token) return
    try {
      const [cRes, sRes, vRes] = await Promise.all([
        http.get<{ ok: boolean; clients: Array<{ name: string }> }>('/api/clients'),
        http.get<{
          ok: boolean
          sites: Array<{
            id: string
            clientName: string
            name: string
            instrumentName?: string
            instrumentCategory?: string
          }>
        }>('/api/sites'),
        http.get<{ ok: boolean; visits: VisitRecord[] }>('/api/visits'),
      ])
      const names = cRes.data?.ok ? cRes.data.clients.map((c) => c.name) : []
      setClientOptions(names)
      const grouped: Record<string, string[]> = {}
      const flat: ApiSite[] = []
      if (sRes.data?.ok) {
        for (const s of sRes.data.sites) {
          if (!grouped[s.clientName]) grouped[s.clientName] = []
          grouped[s.clientName].push(s.name)
          flat.push({ id: s.id, clientName: s.clientName, name: s.name })
        }
      }
      setSitesByClient(grouped)
      setApiSites(flat)
      if (vRes.data?.ok) setVisitRecords(vRes.data.visits)
    } catch {
      toast.error('Could not load visits data')
    }
  }, [token])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const s = apiSites.find((x) => x.clientName === client && x.name === site)
    setMachine(machineLabelFromSite(s))
  }, [client, site, apiSites])

  useEffect(() => {
    if (!client && clientOptions[0]) {
      const first = clientOptions[0]
      setClient(first)
      setSite(sitesByClient[first]?.[0] ?? '')
    }
  }, [client, clientOptions, sitesByClient])

  useEffect(() => {
    if (mode !== 'add') return
    setShowAddForm(true)
    if (requestedClient && clientOptions.includes(requestedClient)) {
      setClient(requestedClient)
      const sites = sitesByClient[requestedClient] ?? []
      if (requestedSiteName && sites.includes(requestedSiteName)) {
        setSite(requestedSiteName)
      } else {
        setSite(sites[0] ?? '')
      }
    }
  }, [mode, requestedClient, requestedSiteName, clientOptions, sitesByClient])

  const siteChoices = useMemo(() => sitesByClient[client] ?? [], [client])
  const amountRupees = useMemo(() => {
    const q = parseFloat(billingQuantity.replace(/[^\d.-]/g, '')) || 0
    const r = parseFloat(billingRate.replace(/[^\d.-]/g, '')) || 0
    const o = parseFloat(billingOtherCharges.replace(/[^\d.-]/g, '')) || 0
    return Math.round(q * r + o)
  }, [billingQuantity, billingRate, billingOtherCharges])
  const amountDisplay = useMemo(() => amountRupees.toLocaleString('en-IN'), [amountRupees])
  const totalAmount = useMemo(
    () => visitRecords.reduce((sum, record) => sum + Number(record.amount.replace(/[^\d.-]/g, '')), 0),
    [visitRecords],
  )

  const mobileBottomNav = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { label: 'Accounts', path: '/account-manager', icon: Briefcase },
    { label: 'Clients', path: '/clients-sites', icon: UsersRound },
    { label: 'Sites', path: '/site-visits', icon: MapPin },
    // { label: 'Reports', path: '/reports', icon: FileBarChart },
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

  const getVisitDetailsPath = (record: VisitRecord) => {
    const params = new URLSearchParams({
      mode: 'visit',
      visitId: record.id,
      client: record.client,
      name: record.site,
      date: record.date,
      machine: record.machine,
      amount: record.amount,
      paymentMode: record.paymentMode,
      paymentStatus: record.paymentStatus,
      notes: record.notes,
      work: record.work,
    })
    const mid = record.visitMongoId ?? record._id
    if (mid) params.set('visitMongoId', mid)
    return `/site-details?${params.toString()}`
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
                const active = item.label === 'Site Visits'
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
                <div className="mt-3 text-base font-extrabold text-white">{user?.fullName || 'User'}</div>
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
                  Site Visits
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
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-neutral-50 md:h-10 md:w-10 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)] lg:hidden"
                  aria-label="Open menu"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu size={18} className="text-neutral-900" />
                </button>
                <div className="truncate text-lg font-extrabold tracking-tight text-neutral-950 sm:text-xl">
                  Site Visits
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
                    <div className="truncate text-xs font-extrabold text-neutral-900 sm:text-sm">Er. Shubham Bhoi</div>
                    <div className="text-[11px] font-semibold text-neutral-600">Admin</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] sm:px-6 sm:pt-6 sm:pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] md:p-6 md:pb-24 lg:p-8 lg:pb-28">
            <div className="mx-auto w-full max-w-[1200px] space-y-6 md:space-y-8">
              {!showAddForm ? (
                <section className="grid grid-cols-2 gap-1.5 md:gap-4 xl:grid-cols-4">
                  <StatCard
                    title="Total Visits"
                    value={String(visitRecords.length)}
                    subtitle="All records"
                    icon={<ClipboardList className="text-sky-600" />}
                    toneClass="bg-sky-100"
                    mobileCardTint="bg-sky-50/90"
                  />
                  <StatCard
                    title="Visit Revenue"
                    value={`₹ ${totalAmount.toLocaleString('en-IN')}`}
                    subtitle="This period"
                    icon={<Briefcase className="text-emerald-600" />}
                    toneClass="bg-emerald-100"
                    mobileCardTint="bg-emerald-50/90"
                  />
                  <StatCard
                    title="Received Amount"
                    value={`₹ ${totalAmount.toLocaleString('en-IN')}`}
                    subtitle="This period"
                    icon={<Calendar className="text-violet-600" />}
                    toneClass="bg-violet-100"
                    mobileCardTint="bg-violet-50/90"
                  />
                  <StatCard
                    title="Pending Visit Amount"
                    value="₹ 0"
                    subtitle="Outstanding"
                    icon={<MapPin className="text-rose-600" />}
                    toneClass="bg-rose-100"
                    mobileCardTint="bg-rose-50/90"
                  />
                </section>
              ) : null}

              {/* Page toolbar — main content only */}
              {showAddForm ? (
                <div className="flex min-w-0 items-center gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-extrabold tracking-tight text-neutral-950 md:text-2xl">Add Site Visit</h2>
                    <p className="mt-0.5 text-sm font-semibold text-neutral-500">
                      Record visit details, work done, and site photos.
                    </p>
                  </div>
                </div>
              ) : (
                <CardPanel className="flex flex-col gap-2.5 p-2.5 md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
                  <div className="w-full md:max-w-[780px]">
                    <input type="text" placeholder="Search visits records..." className={toolbarSearchInputClass} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className={toolbarSecondaryButtonClass}>
                      Filters
                    </button>
                    <button type="button" className={toolbarSecondaryButtonClass}>
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className={toolbarPrimaryButtonClass}
                    >
                      <Plus className={toolbarPlusIconClass} />
                      Add new Site visit
                    </button>
                  </div>
                </CardPanel>
              )}

              {!showAddForm ? (
                <CardShell
                  title="Site visit records"
                  className="overflow-hidden"
                  bodyClassName="p-0"
                  headerEnd={
                    <span className="text-xs font-semibold text-neutral-600">
                      {visitRecords.length} records
                    </span>
                  }
                >
                  <div className="md:hidden">
                    <ul className="flex flex-col gap-1.5 px-3 pb-1.5 pt-1.5">
                      {visitRecords.map((record) => (
                        <li key={`${record.id}-mobile`}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => onNavigate(getVisitDetailsPath(record))}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                onNavigate(getVisitDetailsPath(record))
                              }
                            }}
                            className="w-full rounded-xl border border-neutral-200 bg-white p-2 text-left shadow-sm ring-1 ring-black/5 md:p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-xs font-extrabold text-neutral-900">
                                  {record.client} - {record.site}
                                </div>
                                <div className="mt-0.5 text-[10px] font-semibold text-neutral-500">
                                  {record.id} • {record.date} • {record.paymentStatus}
                                </div>
                              </div>
                              <span className="shrink-0 text-xs font-extrabold text-emerald-600">Rs {record.amount}</span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-end gap-1.5 md:mt-2">
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20 md:h-8 md:w-8"
                                aria-label={`View ${record.id}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getVisitDetailsPath(record))
                                }}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-900 transition hover:bg-neutral-50 md:h-8 md:w-8"
                                aria-label={`Open ${record.id}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getVisitDetailsPath(record))
                                }}
                              >
                                <ArrowRight size={15} />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                      {visitRecords.length === 0 ? (
                        <li className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-xs font-semibold text-neutral-600">
                          No visit records found.
                        </li>
                      ) : null}
                    </ul>
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[980px] border-collapse">
                      <thead className="bg-neutral-50">
                        <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                          <th className="px-6 py-4">Visit ID</th>
                          <th className="px-4 py-4">Client</th>
                          <th className="px-4 py-4">Site</th>
                          <th className="px-4 py-4">Date</th>
                          <th className="px-4 py-4">Machine</th>
                          <th className="px-4 py-4">Pay status</th>
                          <th className="px-4 py-4 text-right">Amount</th>
                          <th className="px-4 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-semibold text-neutral-800">
                        {visitRecords.map((record) => (
                          <tr
                            key={record.id}
                            className="border-t border-neutral-200 hover:bg-neutral-50/60"
                            onClick={() => onNavigate(getVisitDetailsPath(record))}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                onNavigate(getVisitDetailsPath(record))
                              }
                            }}
                          >
                            <td className="px-6 py-4 font-extrabold text-neutral-950">{record.id}</td>
                            <td className="px-4 py-4 text-neutral-700">{record.client}</td>
                            <td className="px-4 py-4 text-neutral-700">{record.site}</td>
                            <td className="px-4 py-4 text-neutral-700">{record.date}</td>
                            <td className="px-4 py-4 text-neutral-700">{record.machine}</td>
                            <td className="px-4 py-4 text-neutral-700">{record.paymentStatus}</td>
                            <td className="px-4 py-4 text-right font-extrabold text-emerald-600">Rs {record.amount}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20"
                                  aria-label={`View ${record.id}`}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    onNavigate(getVisitDetailsPath(record))
                                  }}
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-900 transition hover:bg-neutral-50"
                                  aria-label={`Open ${record.id}`}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    onNavigate(getVisitDetailsPath(record))
                                  }}
                                >
                                  <ArrowRight size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {visitRecords.length === 0 ? (
                          <tr className="border-t border-neutral-200">
                            <td className="px-6 py-8 text-sm font-semibold text-neutral-600" colSpan={8}>
                              No visit records found.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </CardShell>
              ) : (
                <form
                  id={formId}
                  className="space-y-6"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const match = apiSites.find((s) => s.clientName === client && s.name === site)
                    if (!match) {
                      toast.error('Choose a valid client and site.')
                      return
                    }
                    const amountNum = amountRupees
                    try {
                      const res = await http.post<{
                        ok: boolean
                        visit?: { id: string; _id: string; amount: string; paymentStatus: string }
                        error?: string
                      }>('/api/visits', {
                        siteId: match.id,
                        workDescription: workDetails,
                        machineLabel: machine,
                        billingParticular: billingParticular.trim() || undefined,
                        billingQuantity: parseFloat(billingQuantity.replace(/[^\d.-]/g, '')) || 0,
                        billingRate: parseFloat(billingRate.replace(/[^\d.-]/g, '')) || 0,
                        billingOtherCharges: parseFloat(billingOtherCharges.replace(/[^\d.-]/g, '')) || 0,
                        amount: amountNum,
                        paymentMode: '—',
                        paymentStatus: 'pending',
                        notes,
                      })
                      if (res.status !== 201 || !res.data?.ok || !res.data.visit) {
                        toast.error(res.data?.error ?? 'Could not save visit')
                        return
                      }
                      const v = res.data.visit
                      const visitMongoId = v._id
                      if (photos.length) {
                        const fd = new FormData()
                        for (const p of photos) fd.append('photos', p.file)
                        await http.post(`/api/visits/${visitMongoId}/photos`, fd)
                      }
                      toast.success('Visit saved')
                      await loadData()
                      const params = new URLSearchParams({
                        mode: 'visit',
                        visitId: v.id,
                        visitMongoId,
                        client,
                        name: site,
                        date: visitDate,
                        machine,
                        amount: v.amount,
                        paymentStatus: v.paymentStatus,
                        notes,
                        work: workDetails,
                        engineerName,
                        contactPerson: engineerName,
                      })
                      setShowAddForm(false)
                      onNavigate(`/site-details?${params.toString()}`)
                    } catch {
                      toast.error('Could not save visit')
                    }
                  }}
                >
                <CardShell title="Visit Details">
                  <p className="-mt-1 mb-6 text-xs font-semibold text-neutral-500">
                    Core information for this survey visit.
                  </p>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">Client</span>
                      <div className="relative">
                        <select
                          value={client}
                          onChange={(e) => {
                            const next = e.target.value
                            setClient(next)
                            const sites = sitesByClient[next] ?? []
                            setSite(sites[0] ?? '')
                          }}
                          className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-white px-3 pr-10 text-sm font-semibold text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        >
                          {clientOptions.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
                          aria-hidden
                        />
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">Site</span>
                      <div className="relative">
                        <select
                          value={site}
                          onChange={(e) => setSite(e.target.value)}
                          className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-white px-3 pr-10 text-sm font-semibold text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        >
                          {siteChoices.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
                          aria-hidden
                        />
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">Visit Date</span>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={visitDate}
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 pr-10 text-sm font-semibold text-neutral-900 outline-none"
                        />
                        <Calendar
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#f39b03]"
                          aria-hidden
                        />
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">Machine Used</span>
                      <input
                        type="text"
                        readOnly
                        value={machine}
                        title="Set automatically from the instrument linked to this site"
                        className="h-11 w-full cursor-default rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-semibold text-neutral-800 outline-none"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">Engg. Name</span>
                      <input
                        value={engineerName}
                        onChange={(e) => setEngineerName(e.target.value)}
                        placeholder="Enter engineer name"
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                      />
                    </label>

                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-xs font-bold text-neutral-700">Particular</span>
                      <input
                        value={billingParticular}
                        onChange={(e) => setBillingParticular(e.target.value)}
                        placeholder="e.g. Topographic survey, boundary marking…"
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">Quantity</span>
                      <input
                        value={billingQuantity}
                        onChange={(e) => setBillingQuantity(e.target.value)}
                        inputMode="decimal"
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">Rate (₹)</span>
                      <input
                        value={billingRate}
                        onChange={(e) => setBillingRate(e.target.value)}
                        inputMode="decimal"
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">Other charges (₹)</span>
                      <input
                        value={billingOtherCharges}
                        onChange={(e) => setBillingOtherCharges(e.target.value)}
                        inputMode="decimal"
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">Amount (₹)</span>
                      <input
                        readOnly
                        value={amountDisplay}
                        className="h-11 w-full cursor-default rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-semibold text-emerald-800 outline-none"
                      />
                      <span className="text-[11px] font-semibold text-neutral-500">
                        Quantity × Rate + Other charges (rounded)
                      </span>
                    </label>

                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-xs font-bold text-neutral-700">Work Details / Description</span>
                      <textarea
                        value={workDetails}
                        onChange={(e) => setWorkDetails(e.target.value)}
                        rows={3}
                        className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        placeholder="Describe the work completed on site…"
                      />
                    </label>

                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-xs font-bold text-neutral-700">Notes (optional)</span>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        placeholder="Additional remarks…"
                      />
                    </label>
                  </div>
                </CardShell>

                <CardShell title="Site Visit Photos">
                  <p className="-mt-1 mb-6 text-xs font-semibold text-neutral-500">Upload photos from site visit</p>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const files = e.target.files
                        if (!files?.length) return
                        const next: PendingVisitPhoto[] = []
                        for (let i = 0; i < files.length; i++) {
                          const f = files[i]
                          if (!f.type.match(/^image\/(jpeg|png)$/i)) continue
                          next.push({
                            id: `new_${Date.now()}_${i}`,
                            src: URL.createObjectURL(f),
                            file: f,
                          })
                        }
                        if (next.length) setPhotos((prev) => [...prev, ...next])
                        e.target.value = ''
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/80 px-6 py-12 text-center transition hover:border-[#f39b03]/50 hover:bg-[#f39b03]/[0.04]"
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f39b03]/12 text-[#f39b03] ring-1 ring-[#f39b03]/20">
                        <ImagePlus size={22} strokeWidth={2} />
                      </span>
                      <span className="mt-3 text-sm font-extrabold text-neutral-900">Tap to upload photos</span>
                      <span className="mt-1 text-xs font-semibold text-neutral-500">
                        JPG, PNG up to 10MB each
                      </span>
                    </button>

                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-4">
                      {photos.map((p) => (
                        <div
                          key={p.id}
                          className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/5"
                        >
                          <img src={p.src} alt="" className="h-full w-full object-cover" draggable={false} />
                          <button
                            type="button"
                            className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg bg-red-600 text-white shadow-md ring-2 ring-white/90 transition hover:bg-red-700"
                            aria-label="Remove photo"
                            onClick={() => {
                              URL.revokeObjectURL(p.src)
                              setPhotos((prev) => prev.filter((x) => x.id !== p.id))
                            }}
                          >
                            <X size={14} strokeWidth={2.75} />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 bg-white text-neutral-600 transition hover:border-[#f39b03]/45 hover:bg-[#f39b03]/[0.04] hover:text-[#f39b03]"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-100 text-lg font-bold text-neutral-700">
                          +
                        </span>
                        <span className="text-xs font-extrabold">Add More</span>
                      </button>
                    </div>
                  </div>
                </CardShell>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 text-sm font-extrabold text-neutral-800 shadow-sm ring-1 ring-black/5 transition hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form={formId}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f39b03] px-8 text-sm font-extrabold text-white transition hover:bg-[#e18e03]"
                  >
                    Save Visit
                  </button>
                </div>
                </form>
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
            const active =
              item.path === '/site-visits' &&
              (pathname === '/site-visits' || pathname === '/add-site-visit')
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
