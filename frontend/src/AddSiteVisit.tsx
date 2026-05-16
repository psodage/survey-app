import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardList,
  Download,
  CircleUserRound,
  Eye,
  FileBarChart,
  ImagePlus,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Trash2,
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
import { ConfirmAlert } from './ConfirmAlert'
import { AppSelect } from './components/AppSelect'
import { isAxiosError } from 'axios'
import { layoutBrandLogo } from './brandLogo'
import { HeaderYearSelect } from './components/HeaderYearSelect'
import { PageRefreshButton } from './components/PageRefreshButton'
import { usePageRefresh } from './context/RefreshContext'
import { getHeaderDateLabel } from './headerDateLabel'
import { toast } from 'sonner'
import http from './api/http'
import { useAuth } from './context/AuthContext'
import { useSelectedYear } from './context/SelectedYearContext'
import { signOut } from './signOut'
import { exportSiteVisitsPdf } from './exportSiteVisitsPdf'
import { runExport } from './utils/runExport'
import { computeVisitListStats } from './utils/visitListStats'
import { validateSiteVisitForm } from './utils/validateSiteVisit'

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
  visitNo?: number
  client: string
  site: string
  date: string
  machine: string
  work: string
  amount: string
  pendingAmount?: string
  paymentMode: string
  paymentStatus: string
  notes: string
  siteAddress?: string
  sitePhone?: string
  photoUrls?: string[]
}

type ApiSite = {
  id: string
  clientName: string
  name: string
  location?: string
  instrumentName?: string
  instrumentCategory?: string
}

type AddSiteVisitProps = {
  onNavigate: (path: string) => void
}

const visitToolbarSelectClass =
  'h-10 min-w-[120px] flex-1 rounded-xl border border-neutral-200 bg-white px-2.5 text-xs font-bold text-neutral-700 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 sm:min-w-[140px] sm:px-3 sm:text-sm md:h-11 md:flex-initial'

type BillingLineDraft = { id: string; particular: string; quantity: string; rate: string; amount: string }

function newBillingLineId() {
  return `bl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function defaultBillingLines(): BillingLineDraft[] {
  return [{ id: newBillingLineId(), particular: '', quantity: '1', rate: '80', amount: '' }]
}

export default function AddSiteVisit({ onNavigate }: AddSiteVisitProps) {
  const { token, user } = useAuth()
  const { selectedYear } = useSelectedYear()
  const { pathname, search } = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [clientOptions, setClientOptions] = useState<string[]>([])
  const [sitesByClient, setSitesByClient] = useState<Record<string, string[]>>({})
  const [apiSites, setApiSites] = useState<ApiSite[]>([])
  const [visitRecords, setVisitRecords] = useState<VisitRecord[]>([])
  const [visitListSearch, setVisitListSearch] = useState('')
  const [visitPaymentStatusFilter, setVisitPaymentStatusFilter] = useState('all')
  const [pendingDeleteVisit, setPendingDeleteVisit] = useState<VisitRecord | null>(null)
  const [deleteVisitBusy, setDeleteVisitBusy] = useState(false)
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [client, setClient] = useState('')
  const [site, setSite] = useState('')
  const [visitDate] = useState(() => getHeaderDateLabel())
  const [machine, setMachine] = useState('Total Station')
  const [engineerName, setEngineerName] = useState('')
  const [dwgNo, setDwgNo] = useState('')
  const [siteAddress, setSiteAddress] = useState('')
  const [sitePhone, setSitePhone] = useState('')
  const [billingLines, setBillingLines] = useState<BillingLineDraft[]>(() => defaultBillingLines())
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
        http.get<{ ok: boolean; clients: Array<{ name: string }> }>('/api/clients', { params: { year: selectedYear } }),
        http.get<{
          ok: boolean
          sites: Array<{
            id: string
            clientName: string
            name: string
            location?: string
            instrumentName?: string
            instrumentCategory?: string
          }>
        }>('/api/sites', { params: { year: selectedYear } }),
        http.get<{ ok: boolean; visits: VisitRecord[] }>('/api/visits', { params: { year: selectedYear } }),
      ])
      const names = cRes.data?.ok ? cRes.data.clients.map((c) => c.name) : []
      setClientOptions(names)
      const grouped: Record<string, string[]> = {}
      const flat: ApiSite[] = []
      if (sRes.data?.ok) {
        for (const s of sRes.data.sites) {
          if (!grouped[s.clientName]) grouped[s.clientName] = []
          grouped[s.clientName].push(s.name)
          flat.push({
            id: s.id,
            clientName: s.clientName,
            name: s.name,
            location: s.location && s.location !== '—' ? s.location : undefined,
          })
        }
      }
      setSitesByClient(grouped)
      setApiSites(flat)
      if (vRes.data?.ok) setVisitRecords(vRes.data.visits)
    } catch {
      toast.error('Could not load visits data')
    }
  }, [token, selectedYear])

  usePageRefresh(loadData, [loadData])

  useEffect(() => {
    const s = apiSites.find((x) => x.clientName === client && x.name === site)
    setMachine(machineLabelFromSite(s))
    if (s?.location) setSiteAddress(s.location)
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
    const lineSum = billingLines.reduce((sum, line) => {
      const q = parseFloat(line.quantity.replace(/[^\d.-]/g, '')) || 0
      const r = parseFloat(line.rate.replace(/[^\d.-]/g, '')) || 0
      if (q !== 0 && r !== 0) return sum + q * r
      const flat = parseFloat(line.amount.replace(/[^\d.-]/g, '')) || 0
      return sum + flat
    }, 0)
    const o = parseFloat(billingOtherCharges.replace(/[^\d.-]/g, '')) || 0
    return Math.round(lineSum + o)
  }, [billingLines, billingOtherCharges])
  const amountDisplay = useMemo(() => amountRupees.toLocaleString('en-IN'), [amountRupees])
  const filteredVisitRecords = useMemo(() => {
    let list = visitRecords
    if (visitPaymentStatusFilter !== 'all') {
      list = list.filter((r) => r.paymentStatus === visitPaymentStatusFilter)
    }
    const q = visitListSearch.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => {
      const hay = [
        r.id,
        r.client,
        r.site,
        r.date,
        r.machine,
        r.paymentMode,
        r.paymentStatus,
        r.notes,
        r.amount,
        r.pendingAmount ?? '',
        r.work ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [visitRecords, visitListSearch, visitPaymentStatusFilter])

  const hasActiveVisitListFilters = visitListSearch.trim() !== '' || visitPaymentStatusFilter !== 'all'

  const clearVisitListFilters = () => {
    setVisitListSearch('')
    setVisitPaymentStatusFilter('all')
  }

  const visitListStats = useMemo(() => computeVisitListStats(visitRecords), [visitRecords])

  const visitListFilterNote = useMemo(() => {
    if (!hasActiveVisitListFilters) return undefined
    const parts: string[] = []
    if (visitListSearch.trim()) parts.push(`Search: "${visitListSearch.trim()}"`)
    if (visitPaymentStatusFilter !== 'all') parts.push(`Status: ${visitPaymentStatusFilter}`)
    parts.push(`${filteredVisitRecords.length} of ${visitRecords.length} visits`)
    return parts.join(' · ')
  }, [hasActiveVisitListFilters, visitListSearch, visitPaymentStatusFilter, filteredVisitRecords.length, visitRecords.length])

  const visitRowKey = (r: VisitRecord) => r.visitMongoId ?? r._id ?? r.id

  const handleConfirmDeleteVisit = async () => {
    if (!pendingDeleteVisit) return
    const mid = pendingDeleteVisit.visitMongoId ?? pendingDeleteVisit._id
    if (!mid) {
      toast.error('Missing visit id')
      setPendingDeleteVisit(null)
      return
    }
    setDeleteVisitBusy(true)
    try {
      const res = await http.delete<{ ok?: boolean; success?: boolean; message?: string }>(
        `/api/site-visits/${mid}`,
      )
      if (!res.data?.ok && !res.data?.success) {
        toast.error('Could not delete visit')
        return
      }
      toast.success(res.data.message ?? 'Site visit and related photos deleted successfully')
      setPendingDeleteVisit(null)
      setShowAddForm(false)
      if (mode === 'add') {
        onNavigate('/site-visits')
      }
      await loadData()
    } catch {
      toast.error('Could not delete visit')
    } finally {
      setDeleteVisitBusy(false)
    }
  }

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
    if (record.visitNo != null) params.set('visitNo', String(record.visitNo))
    if (record.siteAddress?.trim()) params.set('location', record.siteAddress.trim())
    if (record.sitePhone?.trim()) params.set('phone', record.sitePhone.trim())
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
                    path === '/site-visits'
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
                <PageRefreshButton variant="onDark" />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                <h1 className="min-w-0 truncate text-left text-base font-extrabold leading-tight tracking-tight text-white">
                  Site Visits
                </h1>
                <HeaderYearSelect variant="onDark" compact />
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

          <div className="mobile-main-scroll-pad min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 sm:px-6 sm:pt-6 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-[1200px] space-y-6 pb-6 md:space-y-8 md:pb-0">
              {!showAddForm ? (
                <section className="grid grid-cols-2 gap-1.5 md:gap-4 xl:grid-cols-4">
                  <StatCard
                    title="Total Visits"
                    value={String(visitListStats.visitCount)}
                    subtitle={selectedYear}
                    icon={<ClipboardList className="text-sky-600" />}
                    toneClass="bg-sky-100"
                    mobileCardTint="bg-sky-50/90"
                  />
                  <StatCard
                    title="Visit Revenue"
                    value={`₹ ${visitListStats.totalRevenue.toLocaleString('en-IN')}`}
                    subtitle={selectedYear}
                    icon={<Briefcase className="text-emerald-600" />}
                    toneClass="bg-emerald-100"
                    mobileCardTint="bg-emerald-50/90"
                  />
                  <StatCard
                    title="Received Amount"
                    value={`₹ ${visitListStats.receivedAmount.toLocaleString('en-IN')}`}
                    subtitle={selectedYear}
                    icon={<Calendar className="text-violet-600" />}
                    toneClass="bg-violet-100"
                    mobileCardTint="bg-violet-50/90"
                  />
                  <StatCard
                    title="Pending Visit Amount"
                    value={`₹ ${visitListStats.pendingAmount.toLocaleString('en-IN')}`}
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
                <CardPanel className="flex flex-col gap-2.5 p-2.5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4 md:p-4">
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center md:max-w-none md:flex-1">
                    <input
                      type="search"
                      value={visitListSearch}
                      onChange={(e) => setVisitListSearch(e.target.value)}
                      placeholder="Search visits records..."
                      className={[toolbarSearchInputClass, 'w-full sm:max-w-[min(100%,420px)]'].join(' ')}
                      aria-label="Search visit records"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="grid gap-1">
                        <span className="sr-only">Pay status</span>
                        <AppSelect
                          value={visitPaymentStatusFilter}
                          onChange={setVisitPaymentStatusFilter}
                          className={visitToolbarSelectClass}
                          aria-label="Filter by payment status"
                          options={[
                            { value: 'all', label: 'All pay status' },
                            { value: 'Paid', label: 'Paid' },
                            { value: 'Pending', label: 'Pending' },
                            { value: 'Partial', label: 'Partial' },
                            { value: 'Waived', label: 'Waived' },
                          ]}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {hasActiveVisitListFilters ? (
                      <button type="button" onClick={clearVisitListFilters} className={toolbarSecondaryButtonClass}>
                        Clear filters
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={filteredVisitRecords.length === 0 || exportBusy}
                      onClick={() => {
                        if (filteredVisitRecords.length === 0 || exportBusy) return
                        setExportBusy(true)
                        void runExport('PDF', () =>
                          exportSiteVisitsPdf(
                            filteredVisitRecords.map((r) => ({
                              id: r.id,
                              client: r.client,
                              site: r.site,
                              date: r.date,
                              amount: r.amount,
                              paymentStatus: r.paymentStatus,
                              machine: r.machine,
                            })),
                            { year: selectedYear, filterNote: visitListFilterNote },
                          ),
                        ).finally(() => setExportBusy(false))
                      }}
                      className={toolbarSecondaryButtonClass}
                    >
                      <Download className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      {exportBusy ? 'Exporting…' : 'Export'}
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
                      {hasActiveVisitListFilters
                        ? `${filteredVisitRecords.length} of ${visitRecords.length} records`
                        : `${visitRecords.length} records`}
                    </span>
                  }
                >
                  <div className="md:hidden">
                    <ul className="flex flex-col gap-1.5 px-3 pb-8 pt-1.5">
                      {filteredVisitRecords.map((record) => (
                        <li key={`${visitRowKey(record)}-mobile`}>
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
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 md:h-8 md:w-8"
                                aria-label={`Delete ${record.id}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setPendingDeleteVisit(record)
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                      {visitRecords.length === 0 ? (
                        <li className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-xs font-semibold text-neutral-600">
                          No visit records found.
                        </li>
                      ) : filteredVisitRecords.length === 0 ? (
                        <li className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-xs font-semibold text-neutral-600">
                          No records match your search or filters.
                        </li>
                      ) : null}
                    </ul>
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[1040px] border-collapse">
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
                        {filteredVisitRecords.map((record) => (
                          <tr
                            key={visitRowKey(record)}
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
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                  aria-label={`Delete ${record.id}`}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setPendingDeleteVisit(record)
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredVisitRecords.length === 0 ? (
                          <tr className="border-t border-neutral-200">
                            <td className="px-6 py-8 text-sm font-semibold text-neutral-600" colSpan={8}>
                              {visitRecords.length === 0
                                ? 'No visit records found.'
                                : 'No records match your search or filters.'}
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
                    if (isSubmittingVisit) return

                    const validationError = validateSiteVisitForm({
                      client,
                      site,
                      siteAddress,
                      machine,
                      billingLines,
                      billingOtherCharges,
                      amountRupees,
                    })
                    if (validationError) {
                      toast.error(validationError)
                      return
                    }

                    const match = apiSites.find((s) => s.clientName === client && s.name === site)
                    if (!match) {
                      toast.error('Choose a valid client and site.')
                      return
                    }
                    const amountNum = amountRupees
                    setIsSubmittingVisit(true)
                    try {
                      const visitPayload = {
                        siteId: match.id,
                        siteAddress: siteAddress.trim(),
                        sitePhone: sitePhone.trim(),
                        engineerName: engineerName.trim(),
                        dwgNo: dwgNo.trim() || undefined,
                        contactPerson: engineerName.trim(),
                        workDescription: workDetails,
                        machineLabel: machine,
                        billingLines: billingLines.map((line) => {
                          const q = parseFloat(line.quantity.replace(/[^\d.-]/g, '')) || 0
                          const r = parseFloat(line.rate.replace(/[^\d.-]/g, '')) || 0
                          const flat = parseFloat(line.amount.replace(/[^\d.-]/g, '')) || 0
                          if (q !== 0 && r !== 0) {
                            return { particular: line.particular.trim(), quantity: q, rate: r }
                          }
                          return {
                            particular: line.particular.trim(),
                            quantity: 0,
                            rate: 0,
                            ...(flat > 0 ? { amount: flat } : {}),
                          }
                        }),
                        billingOtherCharges: parseFloat(billingOtherCharges.replace(/[^\d.-]/g, '')) || 0,
                        amount: amountNum,
                        paymentMode: '—',
                        paymentStatus: 'pending',
                        notes,
                      }

                      type VisitCreateRes = {
                        ok: boolean
                        visit?: {
                          id: string
                          _id: string
                          visitNo?: number
                          amount: string
                          paymentStatus: string
                          siteAddress?: string
                          sitePhone?: string
                        }
                        error?: string
                      }

                      let res
                      if (photos.length) {
                        const fd = new FormData()
                        fd.append('payload', JSON.stringify(visitPayload))
                        for (const p of photos) fd.append('photos', p.file)
                        res = await http.post<VisitCreateRes>('/api/visits/with-photos', fd)
                      } else {
                        res = await http.post<VisitCreateRes>('/api/visits', visitPayload)
                      }

                      if (res.status !== 201 || !res.data?.ok || !res.data.visit) {
                        toast.error(res.data?.error ?? 'Could not save visit')
                        return
                      }
                      const v = res.data.visit
                      const visitMongoId = v._id
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
                      if (v.visitNo != null) params.set('visitNo', String(v.visitNo))
                      const addr = (v.siteAddress ?? siteAddress).trim()
                      if (addr) params.set('location', addr)
                      const ph = (v.sitePhone ?? sitePhone).trim()
                      if (ph) params.set('phone', ph)
                      if (match.id) params.set('siteId', match.id)
                      setShowAddForm(false)
                      onNavigate(`/site-details?${params.toString()}`)
                    } catch (err) {
                      const apiMsg = isAxiosError(err)
                        ? (err.response?.data as { error?: string } | undefined)?.error
                        : undefined
                      toast.error(apiMsg ?? 'Could not save visit. Photos were not saved.')
                    } finally {
                      setIsSubmittingVisit(false)
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
                      <AppSelect
                        value={client}
                        onChange={(next) => {
                          setClient(next)
                          const sites = sitesByClient[next] ?? []
                          setSite(sites[0] ?? '')
                        }}
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-3 pr-10 text-sm font-semibold text-neutral-900 outline-none transition hover:border-neutral-300 focus-within:border-[#f39b03]/80 focus-within:ring-2 focus-within:ring-[#f39b03]/20"
                        aria-label="Client"
                        options={clientOptions.map((c) => ({ value: c, label: c }))}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">Site</span>
                      <AppSelect
                        value={site}
                        onChange={setSite}
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-3 pr-10 text-sm font-semibold text-neutral-900 outline-none transition hover:border-neutral-300 focus-within:border-[#f39b03]/80 focus-within:ring-2 focus-within:ring-[#f39b03]/20"
                        aria-label="Site"
                        options={siteChoices.map((s) => ({ value: s, label: s }))}
                      />
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

                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-xs font-bold text-neutral-700">Site address</span>
                      <input
                        value={siteAddress}
                        onChange={(e) => setSiteAddress(e.target.value)}
                        placeholder="Full site address for survey report"
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">Site phone</span>
                      <input
                        value={sitePhone}
                        onChange={(e) => setSitePhone(e.target.value)}
                        placeholder="Contact number at site"
                        inputMode="tel"
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
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

                    <label className="grid gap-2">
                      <span className="text-xs font-bold text-neutral-700">DWG No.</span>
                      <input
                        value={dwgNo}
                        onChange={(e) => setDwgNo(e.target.value)}
                        placeholder="Enter DWG number"
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                      />
                    </label>

                    <div className="grid gap-3 md:col-span-2">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <span className="text-xs font-bold text-neutral-700">Particulars (billing)</span>
                        <button
                          type="button"
                          onClick={() =>
                            setBillingLines((prev) => {
                              const lastRate = prev[prev.length - 1]?.rate ?? '80'
                              return [
                                ...prev,
                                { id: newBillingLineId(), particular: '', quantity: '1', rate: lastRate, amount: '' },
                              ]
                            })
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-bold text-neutral-800 shadow-sm transition hover:border-[#f39b03]/50 hover:bg-[#f39b03]/[0.06]"
                        >
                          <Plus size={14} strokeWidth={2.5} aria-hidden />
                          Add particular
                        </button>
                      </div>
                      <p className="-mt-1 text-[11px] font-semibold text-neutral-500">
                        Use quantity × rate for per-point work, or leave quantity and rate empty and enter a line amount
                        for fixed fees (same style as a printed invoice).
                      </p>
                      <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 md:p-4">
                        {billingLines.map((line, idx) => (
                          <div
                            key={line.id}
                            className="grid grid-cols-1 gap-3 border-b border-neutral-200/80 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_80px_80px_96px_auto] sm:items-end sm:gap-3"
                          >
                            <label className="grid min-w-0 gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                                Particular{billingLines.length > 1 ? ` #${idx + 1}` : ''}
                              </span>
                              <input
                                value={line.particular}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setBillingLines((prev) =>
                                    prev.map((row) => (row.id === line.id ? { ...row, particular: v } : row)),
                                  )
                                }}
                                placeholder="e.g. Topographic survey, boundary marking…"
                                className="h-11 w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                              />
                            </label>
                            <label className="grid gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Qty</span>
                              <input
                                value={line.quantity}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setBillingLines((prev) =>
                                    prev.map((row) => (row.id === line.id ? { ...row, quantity: v } : row)),
                                  )
                                }}
                                inputMode="decimal"
                                className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                              />
                            </label>
                            <label className="grid gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                                Rate (₹)
                              </span>
                              <input
                                value={line.rate}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setBillingLines((prev) =>
                                    prev.map((row) => (row.id === line.id ? { ...row, rate: v } : row)),
                                  )
                                }}
                                inputMode="decimal"
                                className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                              />
                            </label>
                            <label className="grid gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                                Amount (₹)
                              </span>
                              <input
                                value={line.amount}
                                onChange={(e) => {
                                  const v = e.target.value
                                  setBillingLines((prev) =>
                                    prev.map((row) => (row.id === line.id ? { ...row, amount: v } : row)),
                                  )
                                }}
                                inputMode="decimal"
                                placeholder="Fixed"
                                title="Use when this line has no quantity/rate (fixed fee)"
                                className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                              />
                            </label>
                            <div className="flex justify-end sm:justify-center sm:pb-0.5">
                              <button
                                type="button"
                                disabled={billingLines.length <= 1}
                                onClick={() =>
                                  setBillingLines((prev) =>
                                    prev.length <= 1 ? prev : prev.filter((row) => row.id !== line.id),
                                  )
                                }
                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-40"
                                aria-label={`Remove particular row ${idx + 1}`}
                              >
                                <X size={18} strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

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
                        Sum of each row (quantity × rate when both set, otherwise the line amount) + other charges
                        (rounded)
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
                    disabled={isSubmittingVisit}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f39b03] px-8 text-sm font-extrabold text-white transition hover:bg-[#e18e03] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingVisit ? 'Saving…' : 'Save Visit'}
                  </button>
                </div>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>

      <ConfirmAlert
        open={pendingDeleteVisit !== null}
        title="Delete this site visit?"
        description="This permanently removes the visit record, linked transactions, any invoice that includes this visit, and stored visit or invoice PDF file metadata. This cannot be undone."
        detail={
          pendingDeleteVisit
            ? `${pendingDeleteVisit.client} • ${pendingDeleteVisit.site} • ${pendingDeleteVisit.id}`
            : undefined
        }
        confirmLabel="Delete visit"
        cancelLabel="Cancel"
        confirmBusy={deleteVisitBusy}
        variant="danger"
        rootClassName="fixed inset-0 z-[80] flex items-center justify-center p-4"
        onCancel={() => {
          if (!deleteVisitBusy) setPendingDeleteVisit(null)
        }}
        onConfirm={() => {
          void handleConfirmDeleteVisit()
        }}
      />

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
