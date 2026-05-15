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
  Plus,
  UsersRound,
  User2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation as useRouterLocation } from 'react-router-dom'
import { useSelectedYear } from './context/SelectedYearContext'
import { AccountManagerSidebarBlock } from './AccountManagerSidebarBlock'
import { CollaborationBrandMark } from './CollaborationBrandMark'
import { LayoutFooter } from './LayoutFooter'
import {
  CardPanel,
  CardShell,
  surfaceCardClass,
  toolbarPlusIconClass,
  toolbarPrimaryButtonClass,
  toolbarSearchInputClass,
  toolbarSecondaryButtonClass,
} from './dashboardCards'
import { exportCombinedSiteInvoicePdf, exportInvoicePdf, type InvoicePdfBillingLine } from './exportInvoicePdf'
import { exportVisitRecordPdf } from './exportVisitRecordPdf'
import { layoutBrandLogo } from './brandLogo'
import { HeaderYearSelect } from './components/HeaderYearSelect'
import { PageRefreshButton } from './components/PageRefreshButton'
import { useRefresh } from './context/RefreshContext'
import { signOut } from './signOut'
import http from './api/http'
import { useAuth } from './context/AuthContext'

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

type SiteDetailsProps = {
  onNavigate: (path: string) => void
}

type SiteVisitRecord = {
  id: string
  visitMongoId?: string
  client: string
  site: string
  date: string
  machine: string
  amount: string
  /** Balance due (same display format as `amount`); from API `owedAmount` rules */
  pendingAmount?: string
  paymentMode: string
  paymentStatus: string
  notes: string
  work?: string
  photoUrls?: string[]
  billingLines?: InvoicePdfBillingLine[]
  billingOtherCharges?: number
}

const toolbarSelectClass =
  'h-8 min-w-[128px] flex-1 rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-bold text-neutral-700 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 md:h-10 md:min-w-[150px] md:rounded-lg md:px-3 md:text-sm sm:flex-initial'

export function SiteDetails({ onNavigate }: SiteDetailsProps) {
  const { token } = useAuth()
  const { selectedYear } = useSelectedYear()
  const { refreshTick } = useRefresh()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [visitsSearchQuery, setVisitsSearchQuery] = useState('')
  const [visitMachineFilter, setVisitMachineFilter] = useState('all')
  const [visitPaymentFilter, setVisitPaymentFilter] = useState('all')
  const { pathname: routerPathname, search } = useRouterLocation()
  const urlParams = useMemo(() => new URLSearchParams(search), [search])
  const mode = urlParams.get('mode') ?? 'site'
  const isVisitMode = mode === 'visit'
  const client = urlParams.get('client') ?? 'Unknown Client'
  const name = urlParams.get('name') ?? 'Unknown Site'
  const location = urlParams.get('location') ?? 'Unknown Location'
  const lastVisit = urlParams.get('lastVisit') ?? '-'
  const status = urlParams.get('status') ?? 'Active'
  const pending = urlParams.get('pending') ?? '₹0'
  const visitId = urlParams.get('visitId') ?? '-'
  const visitDate = urlParams.get('date') ?? '-'
  const machine = urlParams.get('machine') ?? '-'
  const amount = urlParams.get('amount') ?? '0'
  const paymentMode = urlParams.get('paymentMode') ?? '-'
  const paymentStatus = urlParams.get('paymentStatus') ?? '-'
  const notes = urlParams.get('notes') ?? '-'
  const work = urlParams.get('work') ?? '-'
  const engineerName = urlParams.get('engineerName') ?? ''
  const contactPerson = urlParams.get('contactPerson') ?? engineerName
  const visitMongoId = urlParams.get('visitMongoId')
  const siteId = urlParams.get('siteId')?.trim() ?? ''
  const [relatedVisitRecords, setRelatedVisitRecords] = useState<SiteVisitRecord[]>([])
  const [visitsFetchState, setVisitsFetchState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [visitPhotoUrls, setVisitPhotoUrls] = useState<string[]>([])
  const [visitBillingForInvoice, setVisitBillingForInvoice] = useState<{
    billingLines: InvoicePdfBillingLine[]
    billingOtherCharges: number
  }>({ billingLines: [], billingOtherCharges: 0 })
  const [visitPendingForInvoice, setVisitPendingForInvoice] = useState<string | null>(null)

  useEffect(() => {
    if (!isVisitMode) {
      setVisitPhotoUrls([])
      setVisitBillingForInvoice({ billingLines: [], billingOtherCharges: 0 })
      setVisitPendingForInvoice(null)
      return
    }
    if (!visitMongoId || !token) return
    let cancelled = false
    void http
      .get<{
        ok: boolean
        visit?: {
          photoUrls?: string[]
          billingLines?: InvoicePdfBillingLine[]
          billingOtherCharges?: number
          pendingAmount?: string
        }
      }>(`/api/visits/${visitMongoId}`)
      .then((res) => {
        if (cancelled || !res.data?.ok || !res.data.visit) return
        const v = res.data.visit
        setVisitPhotoUrls(v.photoUrls ?? [])
        setVisitBillingForInvoice({
          billingLines: v.billingLines ?? [],
          billingOtherCharges: Number(v.billingOtherCharges) || 0,
        })
        setVisitPendingForInvoice(v.pendingAmount ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setVisitPhotoUrls([])
          setVisitBillingForInvoice({ billingLines: [], billingOtherCharges: 0 })
          setVisitPendingForInvoice(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [isVisitMode, visitMongoId, token, refreshTick])

  useEffect(() => {
    if (isVisitMode) return
    if (!token) {
      setRelatedVisitRecords([])
      setVisitsFetchState('idle')
      return
    }
    let cancelled = false
    setVisitsFetchState('loading')
    ;(async () => {
      try {
        const params: { year: string; siteId?: string } = { year: selectedYear }
        if (siteId) params.siteId = siteId
        const res = await http.get<{
          ok: boolean
          visits: Array<{
            id: string
            visitMongoId?: string
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
            photoUrls?: string[]
            billingLines?: InvoicePdfBillingLine[]
            billingOtherCharges?: number
          }>
        }>('/api/visits', { params })
        if (cancelled) return
        if (!res.data?.ok) {
          setRelatedVisitRecords([])
          setVisitsFetchState('error')
          return
        }
        let rows: SiteVisitRecord[] = (res.data.visits ?? []).map((v) => ({
          id: v.id,
          visitMongoId: v.visitMongoId,
          client: v.client,
          site: v.site,
          date: v.date,
          machine: v.machine,
          amount: v.amount,
          pendingAmount: v.pendingAmount,
          paymentMode: v.paymentMode,
          paymentStatus: v.paymentStatus,
          notes: v.notes,
          work: v.work,
          photoUrls: v.photoUrls,
          billingLines: v.billingLines,
          billingOtherCharges: v.billingOtherCharges,
        }))
        if (!siteId && client !== 'Unknown Client' && name !== 'Unknown Site') {
          rows = rows.filter((v) => v.client === client && v.site === name)
        }
        setRelatedVisitRecords(rows)
        setVisitsFetchState('ok')
      } catch {
        if (!cancelled) {
          setRelatedVisitRecords([])
          setVisitsFetchState('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isVisitMode, token, selectedYear, siteId, client, name, refreshTick])

  const parseVisitAmount = (amount: string) => Number(amount.replace(/[^\d.]/g, '')) || 0

  const pendingAmountNum = (record: SiteVisitRecord) => {
    const p = record.pendingAmount?.trim()
    if (p) return parseVisitAmount(p)
    return parseVisitAmount(record.amount)
  }

  const visitPaymentStatusSummary = useMemo(() => {
    if (relatedVisitRecords.length === 0) return null
    const counts = new Map<string, number>()
    for (const r of relatedVisitRecords) {
      const label = r.paymentStatus?.trim() || '—'
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    const preferred = ['Paid', 'Pending', 'Partial']
    const parts: string[] = []
    for (const p of preferred) {
      const n = counts.get(p)
      if (n) parts.push(`${p} (${n})`)
    }
    for (const [label, n] of counts) {
      if (!preferred.includes(label)) parts.push(`${label} (${n})`)
    }
    return parts.join(' · ')
  }, [relatedVisitRecords])

  const visitMachineOptions = useMemo(
    () => [...new Set(relatedVisitRecords.map((r) => r.machine))].sort(),
    [relatedVisitRecords],
  )
  const visitPaymentOptions = useMemo(
    () => [...new Set(relatedVisitRecords.map((r) => r.paymentMode))].sort(),
    [relatedVisitRecords],
  )

  const filteredVisitRecords = useMemo(() => {
    let list = relatedVisitRecords
    if (visitMachineFilter !== 'all') {
      list = list.filter((r) => r.machine === visitMachineFilter)
    }
    if (visitPaymentFilter !== 'all') {
      list = list.filter((r) => r.paymentMode === visitPaymentFilter)
    }
    const q = visitsSearchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => {
      const hay = [
        r.id,
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
  }, [relatedVisitRecords, visitsSearchQuery, visitMachineFilter, visitPaymentFilter])

  const hasActiveVisitFilters =
    visitsSearchQuery.trim() !== '' || visitMachineFilter !== 'all' || visitPaymentFilter !== 'all'

  const clearVisitFilters = () => {
    setVisitsSearchQuery('')
    setVisitMachineFilter('all')
    setVisitPaymentFilter('all')
  }

  const handleExportFilteredSiteInvoice = () => {
    if (filteredVisitRecords.length === 0) return
    const visits = filteredVisitRecords.map((r) => ({
      visitId: r.id,
      date: r.date,
      machine: r.machine,
      amount: pendingAmountNum(r),
      notes: r.notes,
      work: r.work,
      billingLines: r.billingLines,
    }))
    void exportCombinedSiteInvoicePdf({
      client,
      site: name,
      location: location !== 'Unknown Location' ? location : undefined,
      invoiceDate: new Date().toLocaleDateString('en-GB'),
      visits,
    })
  }
  const getVisitDetailsPath = (record: SiteVisitRecord) => {
    const next = new URLSearchParams({
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
      work: record.work ?? '',
    })
    if (record.visitMongoId) next.set('visitMongoId', record.visitMongoId)
    if (siteId) next.set('siteId', siteId)
    return `/site-details?${next.toString()}`
  }
  const pageTitle = isVisitMode ? 'Site Visit Details' : 'Site Details'
  const backPath = isVisitMode ? '/site-visits' : '/clients-sites'
  const activeNavLabel = isVisitMode ? 'Site Visits' : 'Clients & Sites'
  const statusLabel = isVisitMode ? 'Visit Record' : status
  const mobileBottomNav = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { label: 'Accounts', path: '/account-manager', icon: Briefcase },
    { label: 'Clients', path: '/clients-sites', icon: UsersRound },
    { label: 'Sites', path: '/site-visits', icon: MapPin },
    // { label: 'Reports', path: '/reports', icon: FileBarChart },
    { label: 'Settings', path: '/settings', icon: Building2 },
  ] as const
  const addSiteVisitParams = new URLSearchParams({ mode: 'add', client, name })
  if (siteId) addSiteVisitParams.set('siteId', siteId)
  const addSiteVisitPath = `/add-site-visit?${addSiteVisitParams.toString()}`

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

  const statusTone =
    status === 'Completed'
      ? 'bg-neutral-100 text-neutral-700 ring-neutral-200'
      : status === 'On Hold'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-200'

  const siteAddressLine = [name, location !== 'Unknown Location' ? location : ''].filter(Boolean).join(', ')

  const handleIndividualVisitInvoice = (record: SiteVisitRecord) => {
    const pendingNum = pendingAmountNum(record)
    const hasBilling = Boolean(record.billingLines?.length)
    void exportInvoicePdf({
      client,
      site: `${siteAddressLine} (Visit ${record.id})`,
      workType: record.machine,
      totalPoints: 1,
      ratePerPoint: pendingNum > 0 ? pendingNum : 0,
      baseCharge: 0,
      extraCharges: 0,
      discount: 0,
      invoiceDate: new Date().toLocaleDateString('en-GB'),
      visitId: record.id,
      paymentStatus: record.paymentStatus,
      pendingAmount: pendingNum,
      ...(hasBilling
        ? {
            billingLines: record.billingLines,
            billingOtherCharges: record.billingOtherCharges ?? 0,
          }
        : {}),
    })
  }

  const handleCommonSiteInvoice = () => {
    const visits = relatedVisitRecords.map((r) => ({
      visitId: r.id,
      date: r.date,
      machine: r.machine,
      amount: pendingAmountNum(r),
      notes: r.notes,
      work: r.work,
      billingLines: r.billingLines,
    }))
    void exportCombinedSiteInvoicePdf({
      client,
      site: name,
      location: location !== 'Unknown Location' ? location : undefined,
      invoiceDate: new Date().toLocaleDateString('en-GB'),
      visits,
    })
  }

  const handleExportVisitPdf = (record: {
    visitId: string
    date: string
    machine: string
    amount: string
    paymentMode: string
    paymentStatus?: string
    notes?: string
    work?: string
    photoUrls?: string[]
  }) => {
    const photos = record.photoUrls?.length ? record.photoUrls : visitPhotoUrls
    void exportVisitRecordPdf({
      visitId: record.visitId,
      client,
      siteName: name,
      location,
      date: record.date,
      machine: record.machine,
      paymentMode: record.paymentMode,
      paymentStatus: record.paymentStatus,
      amount: record.amount,
      notes: record.notes,
      work: record.work,
      contactPerson: contactPerson || 'Site Coordinator',
      phone: '-',
      dwgRefBy: 'Samarth Land Surveyors',
      dwgNo: record.visitId.replace('SV-', ''),
      engineerName: engineerName || 'Er. Shubham Bhoi',
      photoUrls: photos,
    })
  }

  const detailCards: { title: string; value: string; icon: LucideIcon; tone: string; cardTint: string }[] = isVisitMode
    ? [
        {
          title: 'Client Name',
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
            <CollaborationBrandMark variant="desktopSidebar" />
          </div>

          <nav className="mt-5 flex-1 px-3">
            <div className="space-y-1">
              {navItems.map((item) => {
                if (item.label === 'Account Manager') {
                  return (
                    <Fragment key="account-manager">
                      <AccountManagerSidebarBlock
                        pathname={routerPathname}
                        onNavigate={onNavigate}
                        onAfterNavigate={() => setIsSidebarOpen(false)}
                      />
                    </Fragment>
                  )
                }
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
              src={layoutBrandLogo}
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
                if (item.label === 'Account Manager') {
                  return (
                    <Fragment key="account-manager-mobile">
                      <AccountManagerSidebarBlock
                        pathname={routerPathname}
                        onNavigate={onNavigate}
                        onAfterNavigate={() => setIsSidebarOpen(false)}
                      />
                    </Fragment>
                  )
                }
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
                  <CollaborationBrandMark variant="mobileHeader" />
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
                <div className="flex shrink-0 items-center gap-2">
                  <PageRefreshButton variant="onDark" />
                  <HeaderYearSelect variant="onDark" compact />
                  <span className="inline-flex items-center rounded-xl border border-white/20 bg-neutral-900 px-2.5 py-2 text-[11px] font-semibold leading-tight text-white">
                    {statusLabel}
                  </span>
                </div>
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
                <div className="min-w-0 truncate text-lg font-extrabold tracking-tight text-neutral-950 sm:text-xl">
                  {pageTitle}
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
            <div className="mx-auto w-full max-w-6xl space-y-4 md:space-y-6 xl:max-w-7xl">
              <section className={`bg-neutral-900/[0.04] p-4 md:bg-white md:p-6 ${surfaceCardClass}`}>
                <div className="text-[11px] font-semibold text-neutral-500 md:text-sm">Site Name</div>
                <div className="mt-1 text-lg font-extrabold tracking-tight text-neutral-950 md:text-3xl">{name}</div>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="hidden items-center rounded-full bg-[#f39b03]/12 px-3 py-1 text-xs font-extrabold text-[#c97702] ring-1 ring-[#f39b03]/25 md:inline-flex w-fit">
                    {statusLabel}
                  </div>
                  {isVisitMode ? (
                    <p className="text-[11px] font-semibold leading-snug text-neutral-800 md:text-sm">
                      <span className="font-extrabold text-neutral-500">Payment status:</span> {paymentStatus}
                    </p>
                  ) : visitPaymentStatusSummary ? (
                    <p className="text-[11px] font-semibold leading-snug text-neutral-800 md:text-sm">
                      <span className="font-extrabold text-neutral-500">Payment status:</span> {visitPaymentStatusSummary}
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-1.5 md:grid-cols-4 md:gap-4">
                {detailCards.map((card) => (
                  <div
                    key={card.title}
                    className={`w-full min-h-[70px] rounded-xl p-2 shadow-sm ring-1 ring-black/5 md:min-h-[126px] ${card.cardTint} md:rounded-2xl md:bg-white md:p-5 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]`}
                  >
                    <div className="flex items-start gap-1.5 md:gap-4">
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg md:h-12 md:w-12 md:rounded-2xl ${card.tone}`}
                      >
                        <card.icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold leading-tight text-neutral-700 md:text-sm">
                          {card.title}
                        </div>
                        <div
                          className={`mt-0.5 truncate text-base font-extrabold leading-tight tracking-tight md:mt-1 md:text-2xl ${
                            card.title === 'Pending Amount' ? 'text-rose-600' : 'text-neutral-900'
                          }`}
                        >
                          {card.value}
                        </div>
                        <div className="mt-0.5 text-[10px] font-medium leading-snug text-neutral-500 md:mt-1 md:text-xs">
                          {isVisitMode ? 'Visit Snapshot' : 'Site Snapshot'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              {!isVisitMode ? (
                <CardPanel className="flex flex-col gap-2.5 p-2.5 md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
                  <div className="w-full md:max-w-[780px]">
                    <input
                      type="text"
                      value={visitsSearchQuery}
                      onChange={(e) => setVisitsSearchQuery(e.target.value)}
                      placeholder="Search visit records…"
                      className={toolbarSearchInputClass}
                      aria-label="Search visit records"
                    />
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                    
                    <button type="button" className={toolbarSecondaryButtonClass}>
                      Filters
                    </button>
                    {hasActiveVisitFilters ? (
                      <button type="button" className={toolbarSecondaryButtonClass} onClick={clearVisitFilters}>
                        Clear
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={toolbarSecondaryButtonClass}
                      disabled={filteredVisitRecords.length === 0}
                      onClick={handleExportFilteredSiteInvoice}
                    >
                      Export
                    </button>
                    <button type="button" onClick={() => onNavigate(addSiteVisitPath)} className={toolbarPrimaryButtonClass}>
                      <Plus className={toolbarPlusIconClass} />
                      Add new Site visit
                    </button>
                  </div>
                </CardPanel>
              ) : null}

              {isVisitMode ? (
                <CardShell title="Visit Details" className="overflow-hidden" bodyClassName="p-0">
                  <div className="grid grid-cols-1 gap-3 p-4 text-sm font-semibold text-neutral-700 sm:grid-cols-2 sm:px-6 sm:py-5">
                    <p>
                      <span className="text-neutral-500">Machine:</span> {machine}
                    </p>
                    <p>
                      <span className="text-neutral-500">Payment Mode:</span> {paymentMode}
                    </p>
                    <p>
                      <span className="text-neutral-500">Payment Status:</span> {paymentStatus}
                    </p>
                    <p className="sm:col-span-2">
                      <span className="text-neutral-500">Notes:</span> {notes}
                    </p>
                    <p className="sm:col-span-2">
                      <span className="text-neutral-500">Work Details:</span> {work}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-6 sm:py-4">
                    <button
                      type="button"
                      onClick={() =>
                        handleExportVisitPdf({
                          visitId,
                          date: visitDate,
                          machine,
                          amount,
                          paymentMode,
                          paymentStatus,
                          notes,
                          work,
                        })
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#f39b03] px-4 text-xs font-extrabold text-white transition hover:bg-[#e18e03] sm:text-sm"
                    >
                      <Download size={15} />
                      Visit record (PDF)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const pendingForVisit =
                          visitPendingForInvoice != null && visitPendingForInvoice.trim() !== ''
                            ? parseVisitAmount(visitPendingForInvoice)
                            : parseVisitAmount(amount)
                        void exportInvoicePdf({
                          client,
                          site: `${siteAddressLine} (Visit ${visitId})`,
                          workType: machine,
                          totalPoints: 1,
                          ratePerPoint: pendingForVisit > 0 ? pendingForVisit : 0,
                          baseCharge: 0,
                          extraCharges: 0,
                          discount: 0,
                          invoiceDate: new Date().toLocaleDateString('en-GB'),
                          visitId: visitId !== '-' ? visitId : undefined,
                          paymentStatus: paymentStatus !== '-' ? paymentStatus : undefined,
                          pendingAmount: pendingForVisit,
                          ...(visitBillingForInvoice.billingLines.length
                            ? {
                                billingLines: visitBillingForInvoice.billingLines,
                                billingOtherCharges: visitBillingForInvoice.billingOtherCharges,
                              }
                            : {}),
                        })
                      }}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-extrabold text-neutral-800 ring-1 ring-black/5 transition hover:bg-neutral-50 sm:text-sm"
                    >
                      <Calculator size={15} className="text-[#f39b03]" />
                      Individual invoice
                    </button>
                  </div>
                </CardShell>
              ) : (
                <CardShell
                  title="Visit "
                  className="overflow-hidden"
                  bodyClassName="p-0"
                  headerEnd={
                    relatedVisitRecords.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleCommonSiteInvoice}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#f39b03]/40 bg-[#f39b03]/10 px-3 text-[11px] font-extrabold text-[#b87402] transition hover:bg-[#f39b03]/15 sm:text-xs"
                      >
                        <Calculator size={14} className="text-[#f39b03]" />
                        Common invoice (all visits)
                      </button>
                    ) : null
                  }
                >
                  {visitPaymentStatusSummary ? (
                    <div className="border-b border-neutral-100 bg-neutral-50/90 px-3 py-2.5 sm:px-6">
                      <p className="text-[11px] font-semibold leading-snug text-neutral-800 md:text-xs">
                        <span className="font-extrabold text-neutral-500">Payment status</span>
                        <span className="text-neutral-400"> — </span>
                        {visitPaymentStatusSummary}
                      </p>
                    </div>
                  ) : null}
                  {visitsFetchState === 'loading' ? (
                    <div className="px-4 py-5 text-sm font-semibold text-neutral-600 sm:px-6">
                      Loading visit records…
                    </div>
                  ) : visitsFetchState === 'error' ? (
                    <div className="px-4 py-5 text-sm font-semibold text-rose-700 sm:px-6">
                      Could not load visit records. Check your connection and try again.
                    </div>
                  ) : relatedVisitRecords.length === 0 ? (
                    <div className="px-4 py-5 text-sm font-semibold text-neutral-600 sm:px-6">
                      No visit records found for this site
                      {siteId ? ` in ${selectedYear}` : ''}.
                    </div>
                  ) : filteredVisitRecords.length === 0 ? (
                    <div className="px-4 py-5 text-sm font-semibold text-neutral-600 sm:px-6">
                      No visits match your search or filters.{' '}
                      <button
                        type="button"
                        onClick={clearVisitFilters}
                        className="font-extrabold text-[#f39b03] underline decoration-[#f39b03]/40 underline-offset-2 hover:text-[#e18e03]"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="md:hidden">
                        <ul className="flex flex-col gap-1.5 p-2 sm:p-3">
                          {filteredVisitRecords.map((record) => (
                            <li
                              key={`${record.visitMongoId ?? record.id}-mobile`}
                              className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-black/5"
                              role="button"
                              tabIndex={0}
                              onClick={() => onNavigate(getVisitDetailsPath(record))}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  onNavigate(getVisitDetailsPath(record))
                                }
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-extrabold text-neutral-900">{record.id}</div>
                                  <div className="mt-0.5 text-[10px] font-semibold text-neutral-500">{record.date}</div>
                                </div>
                                <span className="shrink-0 text-xs font-extrabold text-emerald-600">Rs {record.amount}</span>
                              </div>
                              <div className="mt-1.5 text-[11px] font-semibold text-neutral-600">
                                {record.machine} • {record.paymentMode} • {record.paymentStatus}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 md:mt-3">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void handleExportVisitPdf({
                                      visitId: record.id,
                                      date: record.date,
                                      machine: record.machine,
                                      amount: record.amount,
                                      paymentMode: record.paymentMode,
                                      paymentStatus: record.paymentStatus,
                                      notes: record.notes,
                                      work: record.work,
                                    })
                                  }}
                                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-[10px] font-extrabold text-neutral-800 transition hover:bg-neutral-50"
                                >
                                  <Download size={12} />
                                  Visit PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleIndividualVisitInvoice(record)
                                  }}
                                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#f39b03]/35 bg-[#f39b03]/10 px-2.5 text-[10px] font-extrabold text-[#b87402] transition hover:bg-[#f39b03]/15"
                                >
                                  <Calculator size={12} className="text-[#f39b03]" />
                                  Invoice
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[980px] border-collapse">
                          <thead className="bg-neutral-50">
                            <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                              <th className="px-4 py-3">Visit ID</th>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Machine</th>
                              <th className="px-4 py-3">Payment</th>
                              <th className="px-4 py-3">Pay status</th>
                              <th className="px-4 py-3 text-right">Amount</th>
                              <th className="px-4 py-3">Notes</th>
                              <th className="px-4 py-3 text-center">Visit PDF</th>
                              <th className="px-4 py-3 text-center">Invoice</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm font-semibold text-neutral-800">
                            {filteredVisitRecords.map((record) => (
                              <tr
                                key={record.visitMongoId ?? record.id}
                                className="border-t border-neutral-200 hover:bg-neutral-50/60"
                                role="button"
                                tabIndex={0}
                                onClick={() => onNavigate(getVisitDetailsPath(record))}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    onNavigate(getVisitDetailsPath(record))
                                  }
                                }}
                              >
                                <td className="px-4 py-3 font-extrabold text-neutral-900">{record.id}</td>
                                <td className="px-4 py-3">{record.date}</td>
                                <td className="px-4 py-3">{record.machine}</td>
                                <td className="px-4 py-3">{record.paymentMode}</td>
                                <td className="px-4 py-3">{record.paymentStatus}</td>
                                <td className="px-4 py-3 text-right font-extrabold text-emerald-600">Rs {record.amount}</td>
                                <td className="px-4 py-3 text-neutral-700">{record.notes}</td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      void handleExportVisitPdf({
                                        visitId: record.id,
                                        date: record.date,
                                        machine: record.machine,
                                        amount: record.amount,
                                        paymentMode: record.paymentMode,
                                        paymentStatus: record.paymentStatus,
                                        notes: record.notes,
                                        work: record.work,
                                      })
                                    }}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-[11px] font-extrabold text-neutral-800 transition hover:bg-neutral-50"
                                  >
                                    <Download size={12} />
                                    PDF
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleIndividualVisitInvoice(record)
                                    }}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#f39b03]/35 bg-[#f39b03]/10 px-2.5 text-[11px] font-extrabold text-[#b87402] transition hover:bg-[#f39b03]/15"
                                  >
                                    <Calculator size={12} className="text-[#f39b03]" />
                                    Individual
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardShell>
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

      <LayoutFooter />
    </div>
  )
}
