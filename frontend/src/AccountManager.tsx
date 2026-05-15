import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CircleUserRound,
  Eye,
  FileText,
  LayoutGrid,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  IndianRupee,
  ReceiptIndianRupee,
  Plus,
  Trash2,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useParams, useSearchParams, type NavigateFunction } from 'react-router-dom'
import { AccountManagerSidebarBlock } from './AccountManagerSidebarBlock'
import { ConfirmAlert } from './ConfirmAlert'
import { CollaborationBrandMark } from './CollaborationBrandMark'
import { LayoutFooter } from './LayoutFooter'
import { type AccountRow, type LedgerTransaction } from './accountManagersData'
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
import { HeaderYearSelect } from './components/HeaderYearSelect'
import { PageRefreshButton } from './components/PageRefreshButton'
import { useRefresh } from './context/RefreshContext'
import { toast } from 'sonner'
import http from './api/http'
import { signOut } from './signOut'
import { useAuth } from './context/AuthContext'
import { useSelectedYear } from './context/SelectedYearContext'

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

function parseCurrency(value: string) {
  return Number(value.replace(/[^\d.-]/g, '')) || 0
}

function formatINR(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function formatDisplayDate(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function slugToDisplayLabel(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const TX_PAGE_SIZE = 12

type TransactionType = 'debit' | 'credit'

type Transaction = LedgerTransaction

type AccountManagerProps = {
  onNavigate: NavigateFunction
}

type LedgerMeta = {
  slug: string
  fullName: string
  shortName: string
  phone: string
  adminId: string
}

type LedgerSummary = {
  totalDebit: number
  totalCredit: number
  netBalance: number
  pendingTotal: number
}

export default function AccountManager({ onNavigate }: AccountManagerProps) {
  const { user, company, managers } = useAuth()
  const [ledgerMeta, setLedgerMeta] = useState<LedgerMeta | null>(null)
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null)
  const [ledgerLoadState, setLedgerLoadState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [isExporting, setIsExporting] = useState(false)
  const prevManagerSlugRef = useRef<string | undefined>(undefined)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { managerId: managerIdFromRoute } = useParams<{ managerId: string }>()
  const [searchParams] = useSearchParams()
  const viewParam = searchParams.get('view')
  const viewMode: 'all' | 'debits' | 'credits' | 'pending' | 'net' =
    viewParam === 'debits'
      ? 'debits'
      : viewParam === 'credits'
        ? 'credits'
        : viewParam === 'pending'
          ? 'pending'
          : viewParam === 'net'
            ? 'net'
            : 'all'

  const location = useLocation()
  const { selectedYear, setSelectedYear } = useSelectedYear()
  const { refreshTick } = useRefresh()
  const appliedNavYearRef = useRef(false)
  const navState = location.state as
    | {
        selectedYear?: string
      }
    | undefined

  useEffect(() => {
    if (appliedNavYearRef.current) return
    appliedNavYearRef.current = true
    const y = navState?.selectedYear
    if (y && /^\d{4}$/.test(y)) setSelectedYear(y)
  }, [navState?.selectedYear, setSelectedYear])

  const [accountRows, setAccountRows] = useState<AccountRow[]>([])
  const [clientSiteOptions, setClientSiteOptions] = useState<Record<string, string[]>>({})
  const clientOptions = useMemo(() => {
    const fromAccounts = accountRows.map((r) => r.name)
    if (fromAccounts.length > 0) return fromAccounts
    return Object.keys(clientSiteOptions).sort((a, b) => a.localeCompare(b))
  }, [accountRows, clientSiteOptions])
  const totalPendingFromRows = accountRows.reduce((sum, row) => sum + parseCurrency(row.pending), 0)
  const totalPending = ledgerSummary?.pendingTotal ?? totalPendingFromRows
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [transactionFilter, setTransactionFilter] = useState<'all' | TransactionType>('all')
  const [pendingFilter, setPendingFilter] = useState<'all' | 'withPending' | 'cleared'>('all')

  const [draftTx, setDraftTx] = useState<Transaction>(() => ({
    id: '',
    type: 'debit',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    reason: '',
  }))

  const [transactionsByManager, setTransactionsByManager] = useState<Record<string, Transaction[]>>({})
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null)
  const [deleteConfirmTxId, setDeleteConfirmTxId] = useState<string | null>(null)
  const [viewingTxId, setViewingTxId] = useState<string | null>(null)
  const routeKey = managerIdFromRoute ?? ''
  const transactions = transactionsByManager[routeKey] ?? []

  const deleteConfirmTransaction = useMemo(
    () => (deleteConfirmTxId ? transactions.find((t) => t.id === deleteConfirmTxId) : undefined),
    [deleteConfirmTxId, transactions],
  )

  const viewingTransaction = useMemo(
    () => (viewingTxId ? transactions.find((t) => t.id === viewingTxId) : undefined),
    [viewingTxId, transactions],
  )

  useEffect(() => {
    if (!viewingTxId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewingTxId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewingTxId])

  useEffect(() => {
    if (viewingTxId && !transactions.some((t) => t.id === viewingTxId)) {
      setViewingTxId(null)
    }
  }, [viewingTxId, transactions])

  useEffect(() => {
    if (!managerIdFromRoute) return
    let cancelled = false
    const switchedManager = prevManagerSlugRef.current !== managerIdFromRoute
    if (switchedManager) {
      setLedgerLoadState('loading')
      setLedgerMeta(null)
      setLedgerSummary(null)
      setAccountRows([])
    }
    ;(async () => {
      try {
        const yearParams = { year: selectedYear }
        const [tRes, aRes, sRes] = await Promise.all([
          http.get<{ ok: boolean; transactions: Array<{ id: string; type: string; amount: number; date: string; reason?: string; client?: string; site?: string }> }>(
            `/api/transactions/${managerIdFromRoute}`,
            { params: yearParams },
          ),
          http.get<{
            ok: boolean
            accounts: AccountRow[]
            manager?: LedgerMeta
            summary?: LedgerSummary
          }>(`/api/account-managers/${managerIdFromRoute}/accounts`, { params: yearParams }),
          http.get<{ ok: boolean; sites: Array<{ clientName: string; name: string }> }>('/api/sites', {
            params: { year: selectedYear },
          }),
        ])
        if (cancelled) return
        if (!aRes.data?.ok) {
          setLedgerLoadState('error')
          return
        }
        if (aRes.data.manager) setLedgerMeta(aRes.data.manager)
        else setLedgerMeta(null)
        if (aRes.data.summary) setLedgerSummary(aRes.data.summary)
        else setLedgerSummary(null)
        if (tRes.data?.ok) {
          setTransactionsByManager((prev) => ({
            ...prev,
            [managerIdFromRoute]: tRes.data.transactions.map((tx) => ({
              id: tx.id,
              type: tx.type as TransactionType,
              amount: tx.amount,
              date: tx.date,
              reason: tx.reason,
              client: tx.client,
              site: tx.site,
            })),
          }))
        }
        if (aRes.data?.ok) setAccountRows(aRes.data.accounts)
        if (sRes.data?.ok) {
          const m: Record<string, string[]> = {}
          for (const s of sRes.data.sites) {
            if (!m[s.clientName]) m[s.clientName] = []
            m[s.clientName].push(s.name)
          }
          setClientSiteOptions(m)
        }
        prevManagerSlugRef.current = managerIdFromRoute
        setLedgerLoadState('ok')
      } catch {
        if (!cancelled) {
          setLedgerLoadState('error')
          toast.error('Could not load account data')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [managerIdFromRoute, selectedYear, refreshTick])

  const managerFromSession = useMemo(
    () => managers.find((m) => m.id === managerIdFromRoute),
    [managers, managerIdFromRoute],
  )

  const manager = useMemo(() => {
    if (!managerIdFromRoute) return undefined
    if (ledgerMeta) {
      return {
        id: ledgerMeta.slug,
        name: ledgerMeta.fullName,
        shortName: ledgerMeta.shortName || ledgerMeta.fullName,
        phone: ledgerMeta.phone ?? '',
      }
    }
    if (managerFromSession) {
      return {
        id: managerFromSession.id,
        name: managerFromSession.name,
        shortName: managerFromSession.shortName || managerFromSession.name,
        phone: managerFromSession.phone ?? '',
      }
    }
    const label = slugToDisplayLabel(managerIdFromRoute)
    return {
      id: managerIdFromRoute,
      name: label,
      shortName: label,
      phone: '',
    }
  }, [ledgerMeta, managerFromSession, managerIdFromRoute])

  const canEditLedger = useMemo(
    () => user?.role === 'super_admin' || (!!user?.id && !!ledgerMeta?.adminId && ledgerMeta.adminId === user.id),
    [user?.role, user?.id, ledgerMeta?.adminId],
  )

  const isLedgerLoading = ledgerLoadState === 'loading'
  const canEditLedgerActions = canEditLedger && !isLedgerLoading

  useEffect(() => {
    if (!canEditLedger) setIsAddOpen(false)
  }, [canEditLedger])

  const sessionDisplayName = (user?.fullName?.trim() || '').length > 0 ? user.fullName.trim() : 'Signed in'
  const sessionEmail = (user?.email?.trim() || '').length > 0 ? user.email.trim() : (company?.email ?? '').trim()
  const sessionPhone = (user?.phone?.trim() || '').length > 0 ? user.phone.trim() : ''
  const roleLabel = user?.role === 'super_admin' ? 'Super admin' : 'Admin'

  const visibleTransactions = useMemo(() => {
    const year = selectedYear
    return transactions
      .filter((t) => t.date.slice(0, 4) === year)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [selectedYear, transactions])

  const totalDebitFromTx = useMemo(
    () => visibleTransactions.filter((t) => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0),
    [visibleTransactions],
  )
  const totalCreditFromTx = useMemo(
    () => visibleTransactions.filter((t) => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0),
    [visibleTransactions],
  )
  const totalDebit = ledgerSummary?.totalDebit ?? totalDebitFromTx
  const totalCredit = ledgerSummary?.totalCredit ?? totalCreditFromTx
  const netBalance = ledgerSummary?.netBalance ?? totalCreditFromTx - totalDebitFromTx

  const tableTransactions = useMemo(() => {
    if (viewMode === 'debits') return visibleTransactions.filter((t) => t.type === 'debit')
    if (viewMode === 'credits') return visibleTransactions.filter((t) => t.type === 'credit')
    return visibleTransactions
  }, [viewMode, visibleTransactions])

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const filteredPendingRows = useMemo(() => {
    return accountRows.filter((row) => {
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        row.name.toLowerCase().includes(normalizedSearchQuery) ||
        row.phone.toLowerCase().includes(normalizedSearchQuery)

      const pendingAmount = parseCurrency(row.pending)
      const matchesFilter =
        pendingFilter === 'all' ||
        (pendingFilter === 'withPending' && pendingAmount > 0) ||
        (pendingFilter === 'cleared' && pendingAmount === 0)

      return matchesSearch && matchesFilter
    })
  }, [accountRows, normalizedSearchQuery, pendingFilter])

  const filteredTableTransactions = useMemo(() => {
    return tableTransactions.filter((tx) => {
      const matchesTypeFilter = transactionFilter === 'all' || tx.type === transactionFilter
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        tx.date.toLowerCase().includes(normalizedSearchQuery) ||
        String(tx.amount).includes(normalizedSearchQuery) ||
        (tx.reason ?? '').toLowerCase().includes(normalizedSearchQuery) ||
        (tx.client ?? '').toLowerCase().includes(normalizedSearchQuery) ||
        (tx.site ?? '').toLowerCase().includes(normalizedSearchQuery)

      return matchesTypeFilter && matchesSearch
    })
  }, [tableTransactions, normalizedSearchQuery, transactionFilter])

  const [txPage, setTxPage] = useState(1)
  const txPageCount = Math.max(1, Math.ceil(filteredTableTransactions.length / TX_PAGE_SIZE))

  const paginatedTableTransactions = useMemo(() => {
    const safePage = Math.min(txPage, txPageCount)
    const start = (safePage - 1) * TX_PAGE_SIZE
    return filteredTableTransactions.slice(start, start + TX_PAGE_SIZE)
  }, [filteredTableTransactions, txPage, txPageCount])

  useEffect(() => {
    setTxPage(1)
  }, [filteredTableTransactions])

  if (!managerIdFromRoute) {
    return <Navigate to={{ pathname: '/account-manager', search: location.search }} replace />
  }

  if (ledgerLoadState === 'error') {
    return <Navigate to={{ pathname: '/account-manager', search: location.search }} replace />
  }

  if (!manager) {
    return <Navigate to={{ pathname: '/account-manager', search: location.search }} replace />
  }

  const pageTitle =
    viewMode === 'debits'
      ? `${manager.shortName} · Debit transactions`
      : viewMode === 'credits'
        ? `${manager.shortName} · Credit transactions`
        : viewMode === 'pending'
          ? `${manager.shortName} · Pending amount`
          : viewMode === 'net'
            ? `${manager.shortName} · Net balance`
            : `${manager.shortName} · Account manager`

  const ledgerCardTitle =
    viewMode === 'pending'
      ? 'Pending Amount by Client'
      : viewMode === 'debits'
        ? 'Debit Transactions'
        : viewMode === 'credits'
          ? 'Credit Transactions'
          : viewMode === 'net'
            ? 'Net Balance'
            : 'Transactions'

  const isAccountManagerRoute = location.pathname.startsWith('/account-manager')

  const handleSummaryCardClick = (kind: 'debits' | 'credits' | 'pending' | 'net') => {
    const qs = new URLSearchParams()
    qs.set('view', kind)
    onNavigate(`/account-manager/${managerIdFromRoute}?${qs.toString()}`)
    setIsSidebarOpen(false)
  }

  const performDeleteTransaction = async (txId: string) => {
    if (!managerIdFromRoute || !canEditLedger) return
    setDeletingTxId(txId)
    try {
      const res = await http.delete<{ ok: boolean }>(`/api/transactions/item/${txId}`)
      if (res.status !== 200 || !res.data?.ok) {
        toast.error('Could not delete transaction')
        return
      }
      setTransactionsByManager((prev) => ({
        ...prev,
        [managerIdFromRoute]: (prev[managerIdFromRoute] ?? []).filter((t) => t.id !== txId),
      }))
      try {
        const aRes = await http.get<{
          ok: boolean
          accounts: AccountRow[]
          summary?: LedgerSummary
        }>(`/api/account-managers/${managerIdFromRoute}/accounts`, { params: { year: selectedYear } })
        if (aRes.data?.ok) {
          setAccountRows(aRes.data.accounts)
          if (aRes.data.summary) setLedgerSummary(aRes.data.summary)
        }
      } catch {
        /* list updated; balances refresh on next navigation if this fails */
      }
      toast.success('Transaction deleted')
      setDeleteConfirmTxId(null)
      setViewingTxId((cur) => (cur === txId ? null : cur))
    } catch {
      toast.error('Could not delete transaction')
    } finally {
      setDeletingTxId(null)
    }
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
                <div className="mt-3 text-base font-extrabold text-white">{sessionDisplayName}</div>
                <div className="mt-1 text-xs font-semibold text-white/65">{roleLabel}</div>
              </div>
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                {sessionEmail ? (
                  <a
                    href={`mailto:${sessionEmail}`}
                    className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-white/90 hover:bg-white/5"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f39b03]">
                      <Mail size={15} />
                    </span>
                    <span className="min-w-0 truncate">{sessionEmail}</span>
                  </a>
                ) : null}
                {sessionPhone ? (
                  <a
                    href={`tel:${sessionPhone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-white/90 hover:bg-white/5"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f39b03]">
                      <Phone size={15} />
                    </span>
                    <span>{sessionPhone}</span>
                  </a>
                ) : null}
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
            {/* Mobile: stacked rows + dark bar so logo and icons read correctly */}
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
                  {pageTitle}
                </h1>
                <HeaderYearSelect variant="onDark" compact />
              </div>
            </div>

            {/* Desktop / tablet */}
            <div className="relative hidden w-full items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-2.5 shadow-[0_6px_20px_rgba(16,24,40,0.05)] sm:px-6 md:flex md:px-6 md:py-4 lg:px-8">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-neutral-50 md:h-10 md:w-10 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)] lg:hidden"
                  aria-label="Open menu"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu size={18} className="text-neutral-900" />
                </button>
                <h1 className="min-w-0 max-w-[min(100%,28rem)] truncate text-lg font-extrabold tracking-tight text-neutral-950 sm:text-xl">
                  {pageTitle}
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <PageRefreshButton variant="onLight" />
                <HeaderYearSelect variant="onLight" />
                <div className="hidden items-center gap-3 rounded-xl bg-neutral-100 px-3 py-2 ring-1 ring-black/5 sm:flex sm:px-4 sm:py-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f39b03]/15 text-[#f39b03]">
                    <CircleUserRound size={18} />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-xs font-extrabold text-neutral-900 sm:text-sm">{sessionDisplayName}</div>
                    <div className="text-[11px] font-semibold text-neutral-600">{roleLabel}</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] sm:px-6 sm:pt-6 sm:pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] md:p-6 md:pb-24 lg:p-8 lg:pb-28"
            aria-busy={isLedgerLoading}
          >
            {!canEditLedger && ledgerLoadState === 'ok' ? (
              <div
                className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 ring-1 ring-amber-200/80 sm:mb-5"
                role="status"
              >
                View only
              </div>
            ) : null}
            <CardShell
              className="mb-4 md:mb-0 md:hidden"
              title="Account manager"
              leadingIcon={<Briefcase size={18} strokeWidth={2} />}
              headerEnd={
                <button
                  type="button"
                  onClick={() => onNavigate(`/account-manager${location.search}`)}
                  className="rounded-lg bg-neutral-900 px-3 py-2 text-[11px] font-bold text-white shadow-sm ring-1 ring-black/10 transition hover:bg-neutral-800 md:text-xs"
                >
                  Change manager
                </button>
              }
              bodyClassName="p-4 sm:p-5 md:p-6"
            >
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-extrabold tracking-tight text-neutral-950">{manager.name}</p>
                <p className="text-sm font-semibold text-neutral-600">{manager.phone}</p>
              </div>
            </CardShell>
            <section
              className={[
                'grid grid-cols-2 gap-1.5 md:gap-4 xl:grid-cols-4',
                isLedgerLoading ? 'pointer-events-none opacity-70' : '',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => handleSummaryCardClick('debits')}
                disabled={isLedgerLoading}
                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70 disabled:cursor-default"
                aria-label="Open debit transactions"
              >
                <StatCard
                  title="Total Debit"
                  value={formatINR(totalDebit)}
                  subtitle={selectedYear}
                  icon={<ReceiptIndianRupee size={20} className="text-rose-600" />}
                  toneClass="bg-rose-100"
                  mobileCardTint="bg-rose-50/90"
                  loading={isLedgerLoading}
                />
              </button>
              <button
                type="button"
                onClick={() => handleSummaryCardClick('credits')}
                disabled={isLedgerLoading}
                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70 disabled:cursor-default"
                aria-label="Open credit transactions"
              >
                <StatCard
                  title="Total Credit"
                  value={formatINR(totalCredit)}
                  subtitle={selectedYear}
                  icon={<Wallet size={20} className="text-emerald-600" />}
                  toneClass="bg-emerald-100"
                  mobileCardTint="bg-emerald-50/90"
                  loading={isLedgerLoading}
                />
              </button>
              <button
                type="button"
                onClick={() => handleSummaryCardClick('net')}
                disabled={isLedgerLoading}
                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70 disabled:cursor-default"
                aria-label="Open net balance details"
              >
                <StatCard
                  title="Net Balance"
                  value={formatINR(netBalance)}
                  subtitle={selectedYear}
                  icon={<Briefcase size={20} className="text-neutral-700 md:text-[#f39b03]" />}
                  toneClass="bg-neutral-200 md:bg-[#f39b03]/12"
                  mobileCardTint="bg-neutral-900/[0.07]"
                  loading={isLedgerLoading}
                />
              </button>
              <button
                type="button"
                onClick={() => handleSummaryCardClick('pending')}
                disabled={isLedgerLoading}
                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70 disabled:cursor-default"
                aria-label="Open pending clients"
              >
                <StatCard
                  title="Pending Amount"
                  value={formatINR(totalPending)}
                  subtitle={selectedYear}
                  icon={<BarChart3 size={20} className="text-rose-600" />}
                  toneClass="bg-rose-100"
                  mobileCardTint="bg-rose-50/90"
                  loading={isLedgerLoading}
                />
              </button>
            </section>

            <section className="mt-4 md:mt-6">
              <CardPanel className="flex flex-col gap-2.5 p-2.5 md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
                <div className="w-full md:max-w-[780px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    disabled={isLedgerLoading}
                    placeholder={viewMode === 'pending' ? 'Search client or phone...' : 'Search transactions...'}
                    className={toolbarSearchInputClass}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {viewMode === 'pending' ? (
                    <select
                      value={pendingFilter}
                      onChange={(event) => setPendingFilter(event.target.value as 'all' | 'withPending' | 'cleared')}
                      disabled={isLedgerLoading}
                      className={toolbarSecondaryButtonClass}
                      aria-label="Filter pending rows"
                    >
                      <option value="all">All Clients</option>
                      <option value="withPending">With Pending</option>
                      <option value="cleared">Cleared</option>
                    </select>
                  ) : (
                    <select
                      value={transactionFilter}
                      onChange={(event) => setTransactionFilter(event.target.value as 'all' | TransactionType)}
                      disabled={isLedgerLoading}
                      className={toolbarSecondaryButtonClass}
                      aria-label="Filter transactions by type"
                    >
                      <option value="all">All Types</option>
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                    </select>
                  )}
                  {viewMode !== 'pending' ? (
                    <>
                      <button
                        type="button"
                        disabled={isLedgerLoading || isExporting}
                        className={toolbarSecondaryButtonClass}
                        aria-label="Export filtered transactions as PDF"
                        title="Download PDF of transactions shown for the selected year"
                        onClick={async () => {
                          if (isExporting) return
                          setIsExporting(true)
                          const toastId = toast.loading('Preparing PDF…')
                          try {
                            const { exportAccountManagerReportPdf } = await import('./exportTransactionsPdf')
                            const exportRows = [...filteredTableTransactions].sort((a, b) =>
                              b.date.localeCompare(a.date),
                            )
                            const debit = exportRows
                              .filter((t) => t.type === 'debit')
                              .reduce((sum, t) => sum + t.amount, 0)
                            const credit = exportRows
                              .filter((t) => t.type === 'credit')
                              .reduce((sum, t) => sum + t.amount, 0)
                            await exportAccountManagerReportPdf({
                              accountManagerName: manager.name,
                              companyName: company?.name,
                              year: selectedYear,
                              transactions: exportRows,
                              totalDebit: debit,
                              totalCredit: credit,
                              netBalance: credit - debit,
                              pendingAmount: totalPending,
                            })
                            toast.success('Report downloaded', { id: toastId })
                          } catch {
                            toast.error('Could not export PDF. Try again or use Share if prompted.', {
                              id: toastId,
                            })
                          } finally {
                            setIsExporting(false)
                          }
                        }}
                      >
                        {isExporting ? 'Exporting…' : 'Export'}
                      </button>
                      {canEditLedgerActions ? (
                        <button
                          type="button"
                          className={toolbarPrimaryButtonClass}
                          onClick={() => {
                            setDraftTx({
                              id: '',
                              type: 'debit',
                              amount: 0,
                              date: new Date().toISOString().slice(0, 10),
                              reason: '',
                            })
                            setIsAddOpen(true)
                          }}
                        >
                          <Plus className={toolbarPlusIconClass} />
                          Add Transaction
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </CardPanel>
            </section>

            {viewMode !== 'pending' && isAddOpen && canEditLedgerActions ? (
              <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 px-4 py-6">
                <div className="w-full max-w-lg rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/10 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-extrabold text-neutral-900">Add Transaction</div>
                      <div className="mt-0.5 text-xs font-semibold text-neutral-500">
                        Debit requires a reason. Credit requires client &amp; site. Credits apply to that site&apos;s
                        visits oldest-first (pending/partial) until the amount is used.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      aria-label="Close"
                      onClick={() => setIsAddOpen(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form
                    className="mt-4 grid grid-cols-1 gap-3"
                    onSubmit={async (event) => {
                      event.preventDefault()
                      if (!managerIdFromRoute) return

                      const trimmedReason = (draftTx.reason ?? '').trim()
                      const trimmedClient = (draftTx.client ?? '').trim()
                      const trimmedSite = (draftTx.site ?? '').trim()

                      if (!draftTx.date) {
                        toast.error('Please select a date')
                        return
                      }
                      if (!Number.isFinite(draftTx.amount) || draftTx.amount <= 0) {
                        toast.error('Enter a valid amount greater than zero')
                        return
                      }
                      if (draftTx.type === 'debit' && trimmedReason.length === 0) {
                        toast.error('Debit transactions require a reason')
                        return
                      }
                      if (draftTx.type === 'credit' && (trimmedClient.length === 0 || trimmedSite.length === 0)) {
                        toast.error('Credit transactions require client and site')
                        return
                      }

                      try {
                        const res = await http.post<{
                          ok: boolean
                          transaction: {
                            id: string
                            type: string
                            amount: number
                            date: string
                            reason?: string
                            client?: string
                            site?: string
                          }
                          error?: string
                        }>(`/api/transactions/${managerIdFromRoute}`, {
                          type: draftTx.type,
                          amount: draftTx.amount,
                          date: draftTx.date,
                          reason: draftTx.type === 'debit' ? trimmedReason : undefined,
                          clientName: draftTx.type === 'credit' ? trimmedClient : undefined,
                          siteName: draftTx.type === 'credit' ? trimmedSite : undefined,
                        })
                        if (res.status !== 201 || !res.data?.ok) {
                          toast.error(res.data?.error ?? 'Could not save transaction')
                          return
                        }
                        const tx = res.data.transaction
                        const next: Transaction = {
                          id: tx.id,
                          type: tx.type as TransactionType,
                          amount: tx.amount,
                          date: tx.date,
                          reason: tx.reason,
                          client: tx.client,
                          site: tx.site,
                        }
                        setTransactionsByManager((prev) => ({
                          ...prev,
                          [managerIdFromRoute]: [next, ...(prev[managerIdFromRoute] ?? [])],
                        }))
                        try {
                          const aRes = await http.get<{
                            ok: boolean
                            accounts: AccountRow[]
                            summary?: LedgerSummary
                          }>(`/api/account-managers/${managerIdFromRoute}/accounts`, {
                            params: { year: selectedYear },
                          })
                          if (aRes.data?.ok) {
                            setAccountRows(aRes.data.accounts)
                            if (aRes.data.summary) setLedgerSummary(aRes.data.summary)
                          }
                        } catch {
                          /* balances refresh on next load */
                        }
                        toast.success('Transaction saved')
                        setIsAddOpen(false)
                      } catch {
                        toast.error('Could not save transaction')
                      }
                    }}
                  >
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      <label className="grid gap-1">
                        <span className="text-xs font-bold text-neutral-700">Type</span>
                        <select
                          value={draftTx.type}
                          onChange={(event) => {
                            const nextType = event.target.value as TransactionType
                            setDraftTx((prev) => {
                              if (nextType === 'debit') {
                                return { ...prev, type: 'debit', client: undefined, site: undefined, reason: prev.reason ?? '' }
                              }
                              const defaultClient = prev.client ?? clientOptions[0] ?? ''
                              const defaultSite = defaultClient ? (clientSiteOptions[defaultClient]?.[0] ?? '') : ''
                              return { ...prev, type: 'credit', reason: '', client: defaultClient, site: defaultSite }
                            })
                          }}
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        >
                          <option value="debit">Debit</option>
                          <option value="credit">Credit</option>
                        </select>
                      </label>

                      <label className="grid gap-1">
                        <span className="text-xs font-bold text-neutral-700">Date</span>
                        <input
                          type="date"
                          value={draftTx.date}
                          onChange={(event) => setDraftTx((prev) => ({ ...prev, date: event.target.value }))}
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        />
                      </label>
                    </div>

                    <label className="grid gap-1">
                      <span className="text-xs font-bold text-neutral-700">Amount</span>
                      <input
                        inputMode="numeric"
                        value={draftTx.amount ? String(draftTx.amount) : ''}
                        onChange={(event) => {
                          const next = Number(event.target.value.replace(/[^\d.]/g, ''))
                          setDraftTx((prev) => ({ ...prev, amount: Number.isFinite(next) ? next : 0 }))
                        }}
                        placeholder="Enter amount"
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                      />
                    </label>

                    {draftTx.type === 'debit' ? (
                      <label className="grid gap-1">
                        <span className="text-xs font-bold text-neutral-700">Reason (Debit)</span>
                        <input
                          value={draftTx.reason ?? ''}
                          onChange={(event) => setDraftTx((prev) => ({ ...prev, reason: event.target.value }))}
                          placeholder="e.g. Petrol, Salary, Equipment..."
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        />
                      </label>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <label className="grid gap-1">
                          <span className="text-xs font-bold text-neutral-700">Client (Credit)</span>
                          <select
                            value={draftTx.client ?? clientOptions[0] ?? ''}
                            onChange={(event) => {
                              const nextClient = event.target.value
                              const sites = clientSiteOptions[nextClient] ?? []
                              setDraftTx((prev) => ({ ...prev, client: nextClient, site: sites[0] ?? '' }))
                            }}
                            disabled={clientOptions.length === 0}
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
                          >
                            {clientOptions.length === 0 ? <option value="">No clients available</option> : null}
                            {clientOptions.map((client) => (
                              <option key={client} value={client}>
                                {client}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-1">
                          <span className="text-xs font-bold text-neutral-700">Site</span>
                          <select
                            value={draftTx.site ?? ''}
                            onChange={(event) => setDraftTx((prev) => ({ ...prev, site: event.target.value }))}
                            disabled={clientOptions.length === 0}
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
                          >
                            {(clientSiteOptions[draftTx.client ?? clientOptions[0] ?? ''] ?? []).map((site) => (
                              <option key={site} value={site}>
                                {site}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

                    <div className="mt-1 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddOpen(false)}
                        className="h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-700 hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="h-11 rounded-xl bg-[#f39b03] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#e18e03]"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}

            <ConfirmAlert
              open={deleteConfirmTxId !== null}
              title="Delete this transaction?"
              description="This cannot be undone."
              detail={
                deleteConfirmTransaction
                  ? `${deleteConfirmTransaction.type === 'debit' ? 'Debit' : 'Credit'} · ${formatINR(
                      deleteConfirmTransaction.amount,
                    )} · ${deleteConfirmTransaction.date}`
                  : undefined
              }
              confirmLabel="Delete"
              cancelLabel="Cancel"
              variant="danger"
              confirmBusy={deletingTxId !== null && deletingTxId === deleteConfirmTxId}
              onCancel={() => {
                if (deletingTxId !== null) return
                setDeleteConfirmTxId(null)
              }}
              onConfirm={() => {
                if (!deleteConfirmTxId) return
                void performDeleteTransaction(deleteConfirmTxId)
              }}
            />

            {viewingTransaction ? (
              <div
                className="fixed inset-0 z-[65] grid place-items-center bg-black/50 px-4 py-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tx-view-title"
              >
                <button
                  type="button"
                  className="absolute inset-0 cursor-default"
                  aria-label="Close transaction details"
                  onClick={() => setViewingTxId(null)}
                />
                <div className="relative z-[66] w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/10 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 id="tx-view-title" className="text-base font-extrabold tracking-tight text-neutral-900 sm:text-lg">
                        Transaction details
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-neutral-500">Summary for this ledger entry</p>
                    </div>
                    <button
                      type="button"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200"
                      aria-label="Close"
                      onClick={() => setViewingTxId(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mt-4 space-y-3 rounded-xl bg-neutral-50 p-4 ring-1 ring-black/5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">Type</span>
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1',
                          viewingTransaction.type === 'debit'
                            ? 'bg-rose-50 text-rose-700 ring-rose-200'
                            : 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                        ].join(' ')}
                      >
                        {viewingTransaction.type === 'debit' ? 'Debit' : 'Credit'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200/80 pt-3">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">Amount</span>
                      <span
                        className={[
                          'text-base font-extrabold',
                          viewingTransaction.type === 'debit' ? 'text-rose-600' : 'text-emerald-600',
                        ].join(' ')}
                      >
                        {formatINR(viewingTransaction.amount)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200/80 pt-3">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">Date</span>
                      <span className="text-sm font-bold text-neutral-900">{formatDisplayDate(viewingTransaction.date)}</span>
                    </div>
                    {viewingTransaction.type === 'debit' ? (
                      <div className="border-t border-neutral-200/80 pt-3">
                        <div className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">Reason</div>
                        <div className="mt-1 text-sm font-semibold text-neutral-900">
                          {(viewingTransaction.reason ?? '').trim() || '—'}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="border-t border-neutral-200/80 pt-3">
                          <div className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">Client</div>
                          <div className="mt-1 text-sm font-semibold text-neutral-900">
                            {(viewingTransaction.client ?? '').trim() || '—'}
                          </div>
                        </div>
                        <div className="border-t border-neutral-200/80 pt-3">
                          <div className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">Site</div>
                          <div className="mt-1 text-sm font-semibold text-neutral-900">
                            {(viewingTransaction.site ?? '').trim() || '—'}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="border-t border-neutral-200/80 pt-3">
                      <div className="text-xs font-extrabold uppercase tracking-wide text-neutral-500">Reference ID</div>
                      <div className="mt-1 break-all font-mono text-[11px] font-semibold text-neutral-600">{viewingTransaction.id}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setViewingTxId(null)}
                      className="h-11 rounded-xl bg-neutral-900 px-5 text-sm font-extrabold text-white shadow-sm ring-1 ring-black/10 transition hover:bg-neutral-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <section className="mt-4 md:mt-6">
              <CardShell title={ledgerCardTitle} className="overflow-hidden" bodyClassName="p-0">
                <div className="md:hidden">
                  {isLedgerLoading ? (
                    <ul className="flex flex-col gap-1.5 px-3 pb-1.5 pt-1.5" aria-hidden>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <li key={`m-sk-${i}`}>
                          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm ring-1 ring-black/5 md:p-3">
                            <div className="h-8 w-8 shrink-0 animate-pulse rounded-xl bg-neutral-200" />
                            <div className="min-w-0 flex-1 py-0.5">
                              <div className="h-3.5 max-w-[14rem] animate-pulse rounded bg-neutral-200" />
                              <div className="mt-2 h-2.5 max-w-[9rem] animate-pulse rounded bg-neutral-100" />
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              <div className="h-3.5 w-16 animate-pulse rounded bg-neutral-200" />
                              <div className="h-2.5 w-12 animate-pulse rounded bg-neutral-100" />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : viewMode === 'pending' ? (
                    filteredPendingRows.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <p className="text-sm font-extrabold text-neutral-800">No pending clients found</p>
                        <p className="mt-1 text-xs font-semibold text-neutral-500">
                          {normalizedSearchQuery || pendingFilter !== 'all'
                            ? 'Try adjusting search or filters.'
                            : `No outstanding client balances for ${selectedYear}.`}
                        </p>
                      </div>
                    ) : (
                    <ul className="flex flex-col gap-1.5 px-3 pb-1.5 pt-1.5">
                      {filteredPendingRows.map((row) => (
                        <li key={row.name}>
                          <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm ring-1 ring-black/5 md:p-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#f39b03]/12 text-[#f39b03]">
                                <IndianRupee size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-xs font-extrabold text-neutral-900">{row.name}</div>
                                <div className="mt-0.5 text-[10px] font-semibold text-neutral-500">{row.phone}</div>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-xs font-extrabold text-rose-600">{row.pending}</div>
                              <div className="mt-0.5 text-[10px] font-semibold text-neutral-500">
                                Net {formatINR(parseCurrency(row.credit) - parseCurrency(row.debit))}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    )
                  ) : filteredTableTransactions.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <p className="text-sm font-extrabold text-neutral-800">No transactions found</p>
                      <p className="mt-1 text-xs font-semibold text-neutral-500">
                        {normalizedSearchQuery || transactionFilter !== 'all'
                          ? 'Try adjusting search or filters.'
                          : `No transactions recorded for ${selectedYear}.`}
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-1.5 px-3 pb-1.5 pt-1.5">
                      {paginatedTableTransactions.map((tx) => (
                        <li key={tx.id}>
                          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm ring-1 ring-black/5 md:p-3">
                            <div
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f39b03]/15 text-[10px] font-extrabold text-[#c97702] ring-1 ring-[#f39b03]/25"
                              aria-hidden
                            >
                              {tx.type === 'debit' ? 'DR' : 'CR'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-bold text-neutral-900">
                                {tx.type === 'debit' ? tx.reason : tx.client}
                              </div>
                              <div className="mt-0.5 text-[10px] font-semibold text-neutral-500">
                                {tx.type === 'credit' ? tx.site : tx.date}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <div
                                className={[
                                  'text-right text-xs font-extrabold leading-tight',
                                  tx.type === 'debit' ? 'text-rose-600' : 'text-emerald-600',
                                ].join(' ')}
                              >
                                {formatINR(tx.amount)}
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewingTxId(tx.id)}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20 md:h-8 md:w-8"
                                aria-label="View transaction"
                              >
                                <Eye size={14} />
                              </button>
                              {canEditLedgerActions ? (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmTxId(tx.id)}
                                  disabled={deletingTxId === tx.id}
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/12 text-rose-600 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50 md:h-8 md:w-8"
                                  aria-label="Delete transaction"
                                >
                                  <Trash2 size={14} />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  {isLedgerLoading ? (
                    viewMode === 'pending' ? (
                      <table className="w-full min-w-[980px] border-collapse">
                        <thead className="bg-neutral-50">
                          <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                            <th className="px-6 py-4">Client</th>
                            <th className="px-4 py-4">Phone</th>
                            <th className="px-4 py-4">Pending Amount (₹)</th>
                            <th className="px-4 py-4">Debit (₹)</th>
                            <th className="px-4 py-4">Credit (₹)</th>
                            <th className="px-4 py-4">Net</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm font-semibold text-neutral-800" aria-hidden>
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <tr key={`d-sk-p-${i}`} className="border-t border-neutral-200">
                              <td className="px-6 py-4">
                                <div className="h-4 max-w-[12rem] animate-pulse rounded bg-neutral-200" />
                              </td>
                              <td className="px-4 py-4">
                                <div className="h-4 max-w-[6rem] animate-pulse rounded bg-neutral-200" />
                              </td>
                              <td className="px-4 py-4">
                                <div className="h-4 max-w-[5rem] animate-pulse rounded bg-neutral-200" />
                              </td>
                              <td className="px-4 py-4">
                                <div className="h-4 max-w-[5rem] animate-pulse rounded bg-neutral-200" />
                              </td>
                              <td className="px-4 py-4">
                                <div className="h-4 max-w-[5rem] animate-pulse rounded bg-neutral-200" />
                              </td>
                              <td className="px-4 py-4">
                                <div className="h-4 max-w-[5rem] animate-pulse rounded bg-neutral-200" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full min-w-[980px] border-collapse">
                        <thead className="bg-neutral-50">
                          <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                            <th className="px-6 py-4">Type</th>
                            <th className="px-4 py-4">Amount (₹)</th>
                            <th className="px-4 py-4">Reason / Client</th>
                            <th className="px-4 py-4">Site</th>
                            <th className="px-4 py-4">Date</th>
                            <th className="px-4 py-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm font-semibold text-neutral-800" aria-hidden>
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <tr key={`d-sk-t-${i}`} className="border-t border-neutral-200">
                              <td className="px-6 py-4">
                                <div className="h-7 w-16 animate-pulse rounded-full bg-neutral-200" />
                              </td>
                              <td className="px-4 py-4">
                                <div className="h-4 max-w-[5rem] animate-pulse rounded bg-neutral-200" />
                              </td>
                              <td className="px-4 py-4">
                                <div className="h-4 max-w-[14rem] animate-pulse rounded bg-neutral-200" />
                              </td>
                              <td className="px-4 py-4">
                                <div className="h-4 max-w-[8rem] animate-pulse rounded bg-neutral-200" />
                              </td>
                              <td className="px-4 py-4">
                                <div className="h-4 max-w-[6rem] animate-pulse rounded bg-neutral-200" />
                              </td>
                              <td className="px-4 py-4">
                                <div className="mx-auto h-9 w-20 animate-pulse rounded-xl bg-neutral-200" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  ) : viewMode === 'pending' ? (
                    <table className="w-full min-w-[980px] border-collapse">
                      <thead className="bg-neutral-50">
                        <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                          <th className="px-6 py-4">Client</th>
                          <th className="px-4 py-4">Phone</th>
                          <th className="px-4 py-4">Pending Amount (₹)</th>
                          <th className="px-4 py-4">Debit (₹)</th>
                          <th className="px-4 py-4">Credit (₹)</th>
                          <th className="px-4 py-4">Net</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-semibold text-neutral-800">
                        {filteredPendingRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-sm font-semibold text-neutral-600">
                              <span className="font-extrabold text-neutral-800">No pending clients found</span>
                              <span className="mt-1 block text-xs">
                                {normalizedSearchQuery || pendingFilter !== 'all'
                                  ? 'Try adjusting search or filters.'
                                  : `No outstanding client balances for ${selectedYear}.`}
                              </span>
                            </td>
                          </tr>
                        ) : null}
                        {filteredPendingRows.map((row) => {
                          const debit = parseCurrency(row.debit)
                          const credit = parseCurrency(row.credit)
                          return (
                            <tr key={row.name} className="border-t border-neutral-200 hover:bg-neutral-50/60">
                              <td className="px-6 py-4 font-extrabold text-neutral-950">{row.name}</td>
                              <td className="px-4 py-4 text-neutral-700">{row.phone}</td>
                              <td className="px-4 py-4 font-extrabold text-rose-600">{row.pending}</td>
                              <td className="px-4 py-4 font-extrabold text-rose-600">{formatINR(debit)}</td>
                              <td className="px-4 py-4 font-extrabold text-emerald-600">{formatINR(credit)}</td>
                              <td className="px-4 py-4 font-extrabold text-neutral-950">{formatINR(credit - debit)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full min-w-[980px] border-collapse">
                      <thead className="bg-neutral-50">
                        <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                          <th className="px-6 py-4">Type</th>
                          <th className="px-4 py-4">Amount (₹)</th>
                          <th className="px-4 py-4">Reason / Client</th>
                          <th className="px-4 py-4">Site</th>
                          <th className="px-4 py-4">Date</th>
                          <th className="px-4 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-semibold text-neutral-800">
                        {filteredTableTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-sm font-semibold text-neutral-600">
                              <span className="font-extrabold text-neutral-800">No transactions found</span>
                              <span className="mt-1 block text-xs">
                                {normalizedSearchQuery || transactionFilter !== 'all'
                                  ? 'Try adjusting search or filters.'
                                  : `No transactions recorded for ${selectedYear}.`}
                              </span>
                            </td>
                          </tr>
                        ) : null}
                        {paginatedTableTransactions.map((tx) => (
                          <tr key={tx.id} className="border-t border-neutral-200 hover:bg-neutral-50/60">
                            <td className="px-6 py-4">
                              <span
                                className={[
                                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1',
                                  tx.type === 'debit'
                                    ? 'bg-rose-50 text-rose-700 ring-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                                ].join(' ')}
                              >
                                {tx.type === 'debit' ? 'Debit' : 'Credit'}
                              </span>
                            </td>
                            <td
                              className={[
                                'px-4 py-4 font-extrabold',
                                tx.type === 'debit' ? 'text-rose-600' : 'text-emerald-600',
                              ].join(' ')}
                            >
                              {formatINR(tx.amount)}
                            </td>
                            <td className="px-4 py-4 font-extrabold text-neutral-950">
                              {tx.type === 'debit' ? tx.reason : tx.client}
                            </td>
                            <td className="px-4 py-4 text-neutral-700">{tx.type === 'credit' ? tx.site : '-'}</td>
                            <td className="px-4 py-4 text-neutral-700">{tx.date}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingTxId(tx.id)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20"
                                  aria-label="View transaction"
                                >
                                  <Eye size={16} />
                                </button>
                                {canEditLedgerActions ? (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmTxId(tx.id)}
                                    disabled={deletingTxId === tx.id}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/12 text-rose-600 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Delete transaction"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {viewMode !== 'pending' && !isLedgerLoading && filteredTableTransactions.length > TX_PAGE_SIZE ? (
                  <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
                    <button
                      type="button"
                      disabled={txPage <= 1}
                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <div className="flex flex-col items-center justify-center gap-1 text-center md:flex-1">
                      <div className="text-sm font-extrabold text-neutral-900">
                        Page {Math.min(txPage, txPageCount)} of {txPageCount}
                      </div>
                      <div className="text-xs font-semibold text-neutral-500">
                        Showing {paginatedTableTransactions.length} of {filteredTableTransactions.length} transactions
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={txPage >= txPageCount}
                      onClick={() => setTxPage((p) => Math.min(txPageCount, p + 1))}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
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
            const active = item.path === '/account-manager' ? isAccountManagerRoute : location.pathname === item.path
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
        {/* Flush black strip through home-indicator inset so the bar doesn’t look “floating” */}
        <div aria-hidden className="mobile-nav-safe-spacer" />
      </nav>

      <LayoutFooter />
    </div>
  )
}
