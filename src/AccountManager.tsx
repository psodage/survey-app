import {
  Bell,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CircleUserRound,
  Eye,
  FileBarChart,
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
  UsersRound,
  Wallet,
  X,
} from 'lucide-react'
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useParams, useSearchParams, type NavigateFunction } from 'react-router-dom'
import { AccountManagerSidebarBlock } from './AccountManagerSidebarBlock'
import { CollaborationBrandMark } from './CollaborationBrandMark'
import {
  accountRowsByManagerId,
  clientNamesForManager,
  getAccountManagerById,
  initialTransactionsByManagerId,
  siteOptionsByClient,
  type LedgerTransaction,
} from './accountManagersData'
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
  { label: 'Reports', icon: <FileBarChart size={16} /> },
  { label: 'Settings', icon: <Building2 size={16} /> },
  { label: 'Log Out', icon: <LogOut size={16} /> },
]

function parseCurrency(value: string) {
  return Number(value.replace(/[^\d.-]/g, '')) || 0
}

function formatINR(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

type TransactionType = 'debit' | 'credit'

type Transaction = LedgerTransaction

type AccountManagerProps = {
  onNavigate: NavigateFunction
}

export default function AccountManager({ onNavigate }: AccountManagerProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { managerId: managerIdFromRoute } = useParams<{ managerId: string }>()
  const manager = managerIdFromRoute ? getAccountManagerById(managerIdFromRoute) : undefined
  const managerId = manager?.id ?? ''
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
  const navState = location.state as
    | {
        selectedYear?: string
      }
    | undefined

  const [selectedYear] = useState(() => navState?.selectedYear ?? '2025')
  const currentDateLabel = getHeaderDateLabel()
  const accountRows = accountRowsByManagerId[managerId] ?? []
  const clientOptions = clientNamesForManager(managerId)
  const totalPending = accountRows.reduce((sum, row) => sum + parseCurrency(row.pending), 0)
  const [isAddOpen, setIsAddOpen] = useState(false)

  const [transactionsByManager, setTransactionsByManager] = useState<Record<string, Transaction[]>>(() => ({
    ...initialTransactionsByManagerId,
  }))
  const transactions = transactionsByManager[managerId] ?? initialTransactionsByManagerId[managerId] ?? []

  const [draftTx, setDraftTx] = useState<Transaction>(() => ({
    id: '',
    type: 'debit',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    reason: '',
  }))

  const visibleTransactions = useMemo(() => {
    const year = selectedYear
    return transactions
      .filter((t) => t.date.slice(0, 4) === year)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [selectedYear, transactions])

  const totalDebit = useMemo(
    () => visibleTransactions.filter((t) => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0),
    [visibleTransactions],
  )
  const totalCredit = useMemo(
    () => visibleTransactions.filter((t) => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0),
    [visibleTransactions],
  )
  const netBalance = totalCredit - totalDebit

  const tableTransactions = useMemo(() => {
    if (viewMode === 'debits') return visibleTransactions.filter((t) => t.type === 'debit')
    if (viewMode === 'credits') return visibleTransactions.filter((t) => t.type === 'credit')
    return visibleTransactions
  }, [viewMode, visibleTransactions])

  const exportTotals = useMemo(() => {
    const debit = tableTransactions.filter((t) => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0)
    const credit = tableTransactions.filter((t) => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0)
    return {
      totalDebit: debit,
      totalCredit: credit,
      netBalance: credit - debit,
    }
  }, [tableTransactions])

  if (!managerIdFromRoute || !manager) {
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
    onNavigate(`/account-manager/${managerId}?${qs.toString()}`, { state: { selectedYear } })
    setIsSidebarOpen(false)
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
    { label: 'Reports', path: '/reports', icon: FileBarChart },
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
                  className={[
                    'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[11px] font-bold ring-1 transition',
                    'bg-white/5 text-white/85 ring-white/10 hover:bg-white/10',
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
                  {pageTitle}
                </h1>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-neutral-900 px-2.5 text-[11px] font-semibold text-white transition hover:bg-neutral-800"
                  aria-label="Current date"
                >
                  <Calendar size={13} className="text-[#f39b03]" />
                  <span className="whitespace-nowrap">{currentDateLabel}</span>
                </button>
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
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-900 sm:px-4 sm:py-2.5 sm:text-sm"
                  aria-label="Current date"
                >
                  <Calendar size={16} className="text-[#f39b03]" />
                  <span className="whitespace-nowrap">{currentDateLabel}</span>
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

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] sm:px-6 sm:pt-6 sm:pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] md:p-6 md:pb-24 lg:p-8 lg:pb-28">
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
            <section className="grid grid-cols-2 gap-1.5 md:gap-4 xl:grid-cols-4">
              <button
                type="button"
                onClick={() => handleSummaryCardClick('debits')}
                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                aria-label="Open debit transactions"
              >
                <StatCard
                  title="Total Debit"
                  value={formatINR(totalDebit)}
                  subtitle="This Financial Year"
                  icon={<ReceiptIndianRupee size={20} className="text-rose-600" />}
                  toneClass="bg-rose-100"
                  mobileCardTint="bg-rose-50/90"
                />
              </button>
              <button
                type="button"
                onClick={() => handleSummaryCardClick('credits')}
                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                aria-label="Open credit transactions"
              >
                <StatCard
                  title="Total Credit"
                  value={formatINR(totalCredit)}
                  subtitle="This Financial Year"
                  icon={<Wallet size={20} className="text-emerald-600" />}
                  toneClass="bg-emerald-100"
                  mobileCardTint="bg-emerald-50/90"
                />
              </button>
              <button
                type="button"
                onClick={() => handleSummaryCardClick('net')}
                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                aria-label="Open net balance details"
              >
                <StatCard
                  title="Net Balance"
                  value={formatINR(netBalance)}
                  subtitle="This Financial Year"
                  icon={<Briefcase size={20} className="text-neutral-700 md:text-[#f39b03]" />}
                  toneClass="bg-neutral-200 md:bg-[#f39b03]/12"
                  mobileCardTint="bg-neutral-900/[0.07]"
                />
              </button>
              <button
                type="button"
                onClick={() => handleSummaryCardClick('pending')}
                className="w-full cursor-pointer rounded-xl bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                aria-label="Open pending clients"
              >
                <StatCard
                  title="Pending Amount"
                  value={formatINR(totalPending)}
                  subtitle="This Financial Year"
                  icon={<BarChart3 size={20} className="text-rose-600" />}
                  toneClass="bg-rose-100"
                  mobileCardTint="bg-rose-50/90"
                />
              </button>
            </section>

            {viewMode !== 'pending' ? (
              <section className="mt-4 md:mt-6">
                <CardPanel className="flex flex-col gap-2.5 p-2.5 md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
                  <div className="w-full md:max-w-[780px]">
                    <input type="text" placeholder="Search account..." className={toolbarSearchInputClass} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className={toolbarSecondaryButtonClass}>
                      Filters
                    </button>
                    <button
                      type="button"
                      className={toolbarSecondaryButtonClass}
                      aria-label="Export filtered transactions as PDF"
                      title="Download PDF of transactions shown for the selected year"
                      onClick={async () => {
                        const { exportFilteredTransactionsPdf } = await import('./exportTransactionsPdf')
                        exportFilteredTransactionsPdf({
                          year: selectedYear,
                          transactions: tableTransactions,
                          totalDebit: exportTotals.totalDebit,
                          totalCredit: exportTotals.totalCredit,
                          netBalance: exportTotals.netBalance,
                        })
                      }}
                    >
                      Export
                    </button>
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
                  </div>
                </CardPanel>
              </section>
            ) : null}

            {viewMode !== 'pending' && isAddOpen ? (
              <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 px-4 py-6">
                <div className="w-full max-w-lg rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/10 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-extrabold text-neutral-900">Add Transaction</div>
                      <div className="mt-0.5 text-xs font-semibold text-neutral-500">
                        Debit requires a reason. Credit requires client &amp; site.
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
                    onSubmit={(event) => {
                      event.preventDefault()

                      const trimmedReason = (draftTx.reason ?? '').trim()
                      const trimmedClient = (draftTx.client ?? '').trim()
                      const trimmedSite = (draftTx.site ?? '').trim()

                      if (!draftTx.date) return
                      if (!Number.isFinite(draftTx.amount) || draftTx.amount <= 0) return
                      if (draftTx.type === 'debit' && trimmedReason.length === 0) return
                      if (draftTx.type === 'credit' && (trimmedClient.length === 0 || trimmedSite.length === 0)) return

                      const next: Transaction = {
                        id: `t_${Date.now()}`,
                        type: draftTx.type,
                        amount: draftTx.amount,
                        date: draftTx.date,
                        reason: draftTx.type === 'debit' ? trimmedReason : undefined,
                        client: draftTx.type === 'credit' ? trimmedClient : undefined,
                        site: draftTx.type === 'credit' ? trimmedSite : undefined,
                      }

                      setTransactionsByManager((prev) => ({
                        ...prev,
                        [managerId]: [next, ...(prev[managerId] ?? [])],
                      }))
                      setIsAddOpen(false)
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
                              const defaultClient = prev.client ?? clientOptions[0]
                              const defaultSite = siteOptionsByClient[defaultClient]?.[0] ?? ''
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
                            value={draftTx.client ?? clientOptions[0]}
                            onChange={(event) => {
                              const nextClient = event.target.value
                              const sites = siteOptionsByClient[nextClient] ?? []
                              setDraftTx((prev) => ({ ...prev, client: nextClient, site: sites[0] ?? '' }))
                            }}
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          >
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
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          >
                            {(siteOptionsByClient[draftTx.client ?? clientOptions[0]] ?? []).map((site) => (
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

            <section className="mt-4 md:mt-6">
              <CardShell title={ledgerCardTitle} className="overflow-hidden" bodyClassName="p-0">
                <div className="md:hidden">
                  {viewMode === 'pending' ? (
                    <ul className="flex flex-col gap-1.5 px-3 pb-1.5 pt-1.5">
                      {accountRows.map((row) => (
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
                  ) : (
                    <ul className="flex flex-col gap-1.5 px-3 pb-1.5 pt-1.5">
                      {tableTransactions.map((tx) => (
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
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20 md:h-8 md:w-8"
                                aria-label="View transaction"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  {viewMode === 'pending' ? (
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
                        {accountRows.map((row) => {
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
                        {tableTransactions.map((tx) => (
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
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20"
                                  aria-label="View transaction"
                                >
                                  <Eye size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {viewMode !== 'pending' ? (
                  <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-800 hover:bg-neutral-50"
                    >
                      Previous
                    </button>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-xl bg-[#f39b03] text-sm font-extrabold text-white"
                        aria-label="Page 1"
                      >
                        1
                      </button>
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-xl border border-neutral-200 bg-white text-sm font-extrabold text-neutral-800 hover:bg-neutral-50"
                        aria-label="Page 2"
                      >
                        2
                      </button>
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-xl border border-neutral-200 bg-white text-sm font-extrabold text-neutral-800 hover:bg-neutral-50"
                        aria-label="Page 3"
                      >
                        3
                      </button>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-800 hover:bg-neutral-50"
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

      <footer className="fixed inset-x-0 bottom-0 z-50 hidden border-t border-white/10 bg-gradient-to-b from-[#050505] via-[#0b0b0b] to-[#040404] text-white shadow-[0_-12px_30px_rgba(0,0,0,0.3)] md:block">
        <div className="mx-auto flex w-full max-w-none items-center justify-between gap-3 px-3 py-2 sm:px-5 sm:py-3">
          <img
            src={layoutBrandLogo}
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
