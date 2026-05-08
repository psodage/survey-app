import {
  Bell,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  Calculator,
  CircleUserRound,
  Eye,
  FileText,
  Filter,
  LayoutGrid,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  ReceiptIndianRupee,
  Search,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useLocation, type NavigateFunction } from 'react-router-dom'
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
  { label: 'Measurement', icon: <Calculator size={16} /> },
  { label: 'Settings', icon: <Building2 size={16} /> },
  { label: 'Log Out', icon: <LogOut size={16} /> },
]

type SummaryCardProps = {
  title: string
  value: string
  subtitle: string
  icon: ReactNode
  toneClass: string
  /** Full-card soft tint on mobile only (md+ uses white card) */
  mobileCardTint: string
  onClick?: () => void
  ariaLabel?: string
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  toneClass,
  mobileCardTint,
  onClick,
  ariaLabel,
}: SummaryCardProps) {
  const classes = [
    'w-full rounded-xl p-3 shadow-sm ring-1 ring-black/5',
    mobileCardTint,
    'md:rounded-2xl md:bg-white md:p-5 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]',
    onClick ? 'cursor-pointer transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/50' : '',
  ].join(' ')

  const content = (
    <div className="flex items-start gap-2 md:gap-4">
      <div
        className={[
          'grid h-9 w-9 shrink-0 place-items-center rounded-xl md:h-12 md:w-12 md:rounded-2xl',
          toneClass,
        ].join(' ')}
      >
        <span className="[&>svg]:h-4 [&>svg]:w-4 md:scale-100 md:[&>svg]:h-5 md:[&>svg]:w-5">
          {icon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold leading-tight text-neutral-700 md:text-sm">{title}</div>
        <div className="mt-0.5 text-base font-extrabold leading-tight tracking-tight text-neutral-950 md:mt-1 md:text-2xl">
          {value}
        </div>
        <div className="mt-0.5 text-[10px] font-medium leading-snug text-neutral-500 md:mt-1 md:text-xs">{subtitle}</div>
      </div>
    </div>
  )

  return onClick ? (
    <button type="button" onClick={onClick} aria-label={ariaLabel ?? title} className={classes}>
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  )
}

const accountRows = [
  {
    name: 'Amit Developers',
    phone: '+91 8643001010',
    totalRevenue: '₹2,25,000',
    received: '₹1,40,000',
    pending: '₹85,000',
    debit: '₹10,000',
    credit: '₹1,50,000',
  },
  {
    name: 'Shree Krishna Infra',
    phone: '+91 7026016077',
    totalRevenue: '₹2,10,000',
    received: '₹1,45,000',
    pending: '₹65,000',
    debit: '₹7,500',
    credit: '₹1,52,500',
  },
  {
    name: 'Vishwakarma Properties',
    phone: '+91 9595975566',
    totalRevenue: '₹1,85,000',
    received: '₹1,20,000',
    pending: '₹65,000',
    debit: '₹5,000',
    credit: '₹1,25,000',
  },
  {
    name: 'Gajanan Projects',
    phone: '+91 7058129002',
    totalRevenue: '₹1,70,000',
    received: '₹95,000',
    pending: '₹75,000',
    debit: '₹9,000',
    credit: '₹1,04,000',
  },
  {
    name: 'Sai Realities',
    phone: '+91 9011122334',
    totalRevenue: '₹1,55,000',
    received: '₹1,05,500',
    pending: '₹49,500',
    debit: '₹6,500',
    credit: '₹1,12,000',
  },
  {
    name: 'Green Valley Constructions',
    phone: '+91 9988776655',
    totalRevenue: '₹1,30,000',
    received: '₹80,000',
    pending: '₹50,000',
    debit: '₹4,000',
    credit: '₹84,000',
  },
]

function parseCurrency(value: string) {
  return Number(value.replace(/[^\d.-]/g, '')) || 0
}

function formatINR(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

type TransactionType = 'debit' | 'credit'

type Transaction = {
  id: string
  type: TransactionType
  amount: number
  date: string // yyyy-mm-dd
  reason?: string
  client?: string
  site?: string
}

const clientOptions = ['Amit Developers', 'Shree Krishna Infra', 'Vishwakarma Properties', 'Gajanan Projects']
const siteOptionsByClient: Record<string, string[]> = {
  'Amit Developers': ['Wakad Site', 'Baner Site'],
  'Shree Krishna Infra': ['Hinjewadi Site'],
  'Vishwakarma Properties': ['Kothrud Site'],
  'Gajanan Projects': ['Ravet Site'],
}

type AccountManagerProps = {
  onNavigate: NavigateFunction
  viewMode?: 'all' | 'debits' | 'credits' | 'pending' | 'net'
}

export default function AccountManager({ onNavigate, viewMode = 'all' }: AccountManagerProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const location = useLocation()
  const navState = location.state as
    | {
        selectedYear?: string
        transactions?: Transaction[]
      }
    | undefined

  const [selectedYear] = useState(() => navState?.selectedYear ?? '2025')
  const currentDateLabel = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const totalPending = accountRows.reduce((sum, row) => sum + parseCurrency(row.pending), 0)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const defaultTransactions: Transaction[] = [
    { id: 't1', type: 'debit', amount: 1500, date: '2025-05-20', reason: 'Petrol' },
    { id: 't2', type: 'credit', amount: 12000, date: '2025-05-18', client: 'Amit Developers', site: 'Wakad Site' },
  ]

  const [transactions, setTransactions] = useState<Transaction[]>(() => navState?.transactions ?? defaultTransactions)
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

  const pageTitle =
    viewMode === 'debits'
      ? 'Debit Transactions'
      : viewMode === 'credits'
        ? 'Credit Transactions'
        : viewMode === 'pending'
          ? 'Pending Amount'
          : viewMode === 'net'
            ? 'Net Balance'
            : 'Account Manager'

  const isAccountManagerRoute = location.pathname.startsWith('/account-manager')

  const handleSummaryCardClick = (kind: 'debits' | 'credits' | 'pending' | 'net') => {
    const state = { selectedYear, transactions }
    if (kind === 'debits') onNavigate('/account-manager/debits', { state })
    else if (kind === 'credits') onNavigate('/account-manager/credits', { state })
    else if (kind === 'pending') onNavigate('/account-manager/pending', { state })
    else onNavigate('/account-manager/net-balance', { state })
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
      Measurement: '/measurement-rate-calculator',
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
    { label: 'Measure', path: '/measurement-rate-calculator', icon: Calculator },
    { label: 'Settings', path: '/settings', icon: Building2 },
  ] as const

  return (
    <div className="flex h-[100svh] max-h-[100svh] min-h-[100svh] flex-col overflow-hidden bg-black md:h-dvh md:max-h-dvh md:min-h-dvh md:bg-neutral-100">
      <div className="flex min-h-0 flex-1 w-full max-w-none">
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[280px] flex-col bg-gradient-to-b from-[#050505] via-[#0b0b0b] to-[#040404] pb-20 text-white lg:flex">
          <div className="px-6 pt-7">
            <div className="flex items-center gap-3">
              <img
                src="/samarth-logo.png"
                alt="Samarth Land Surveyors"
                className="h-25 w-auto"
                draggable={false}
              />
            </div>
          </div>

          <nav className="mt-5 flex-1 px-3">
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = item.label === 'Account Manager' ? isAccountManagerRoute : false
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
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
                { label: 'Accounts', path: '/account-manager', icon: Briefcase },
                { label: 'Clients', path: '/clients-sites', icon: UsersRound },
                { label: 'Visits', path: '/site-visits', icon: MapPin },
                { label: 'Measurement', path: '/measurement-rate-calculator', icon: Calculator },
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
                    path === '/account-manager'
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
                  {pageTitle}
                </div>
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
            <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
              <SummaryCard
                title="Total Debit"
                value={formatINR(totalDebit)}
                subtitle="This Financial Year"
                icon={<ReceiptIndianRupee size={20} className="text-rose-600" />}
                toneClass="bg-rose-100"
                mobileCardTint="bg-rose-50/90"
                onClick={() => handleSummaryCardClick('debits')}
                ariaLabel="Open debit transactions"
              />
              <SummaryCard
                title="Total Credit"
                value={formatINR(totalCredit)}
                subtitle="This Financial Year"
                icon={<Wallet size={20} className="text-emerald-600" />}
                toneClass="bg-emerald-100"
                mobileCardTint="bg-emerald-50/90"
                onClick={() => handleSummaryCardClick('credits')}
                ariaLabel="Open credit transactions"
              />
              <SummaryCard
                title="Net Balance"
                value={formatINR(netBalance)}
                subtitle="This Financial Year"
                icon={<Briefcase size={20} className="text-neutral-700 md:text-[#f39b03]" />}
                toneClass="bg-neutral-200 md:bg-[#f39b03]/12"
                mobileCardTint="bg-neutral-900/[0.07]"
                onClick={() => handleSummaryCardClick('net')}
                ariaLabel="Open net balance details"
              />
              <SummaryCard
                title="Pending Amount"
                value={formatINR(totalPending)}
                subtitle="This Financial Year"
                icon={<BarChart3 size={20} className="text-rose-600" />}
                toneClass="bg-rose-100"
                mobileCardTint="bg-rose-50/90"
                onClick={() => handleSummaryCardClick('pending')}
                ariaLabel="Open pending clients"
              />
            
            </section>

            {viewMode !== 'pending' ? (
              <section className="mt-4 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-black/5 sm:p-4 md:mt-6 md:rounded-2xl md:p-5 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
              <div className="flex flex-col gap-2.5 md:gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full md:max-w-none lg:max-w-xl">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400 md:h-[17px] md:w-[17px]"
                  />
                  <input
                    type="text"
                    placeholder="Search account..."
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs font-medium text-neutral-800 outline-none transition focus:border-[#f39b03] focus:bg-white focus:ring-2 focus:ring-[#f39b03]/20 md:h-11 md:rounded-xl md:pl-10 md:pr-4 md:text-sm"
                  />
                </div>

                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-2 lg:gap-2">
                  <div className="flex w-full items-stretch md:w-auto">
                    <button
                      type="button"
                      className="inline-flex h-9 flex-1 items-center justify-start gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 md:h-11 md:flex-initial md:rounded-xl md:px-4 md:text-sm"
                    >
                      <Filter className="h-4 w-4 shrink-0 md:h-4 md:w-4" aria-hidden />
                      Filters
                    </button>
                    <div className="flex flex-1 items-center justify-center md:flex-initial">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 md:h-11 md:rounded-xl md:px-4 md:text-sm"
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
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex h-9 w-full shrink-0 items-center justify-center rounded-lg bg-[#f39b03] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#e18e03] md:inline-flex md:h-11 md:w-auto md:rounded-xl md:px-5 md:text-sm"
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
                    + Add Transaction
                  </button>
                </div>
              </div>
            </section>
            ) : null}

            {viewMode !== 'pending' && isAddOpen ? (
              <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 px-4 py-6">
                <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/10 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
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

                      setTransactions((prev) => [next, ...prev])
                      setIsAddOpen(false)
                    }}
                  >
                    <div className="grid grid-cols-2 gap-3">
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
                      <div className="grid grid-cols-2 gap-3">
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

            <section className="mt-4 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 md:mt-6 md:rounded-2xl md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
              <div className="md:hidden">
                {viewMode === 'pending' ? (
                  <ul className="flex flex-col gap-2 px-3 pb-1.5 pt-1.5">
                    {accountRows.map((row) => (
                      <li key={row.name}>
                        <div className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/5">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-neutral-900">{row.name}</div>
                            <div className="mt-0.5 text-[10px] font-semibold text-neutral-500">{row.phone}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs font-extrabold text-rose-600">{row.pending}</div>
                            <div className="mt-0.5 text-[10px] font-semibold text-neutral-500">
                              Net: {formatINR(parseCurrency(row.credit) - parseCurrency(row.debit))}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="flex flex-col gap-2 px-3 pb-1.5 pt-1.5">
                    {tableTransactions.map((tx) => (
                      <li key={tx.id}>
                        <div className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm ring-1 ring-black/5">
                          <div
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f39b03]/15 text-[11px] font-extrabold text-[#c97702] ring-1 ring-[#f39b03]/25"
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
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20"
                              aria-label="View transaction"
                            >
                              <Eye size={15} />
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
                        <th className="px-5 py-4">Client</th>
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
                          <tr key={row.name} className="border-t border-neutral-200 hover:bg-neutral-50/70">
                            <td className="px-5 py-4 font-bold text-neutral-900">{row.name}</td>
                            <td className="px-4 py-4 font-bold text-neutral-700">{row.phone}</td>
                            <td className="px-4 py-4 font-extrabold text-rose-600">{row.pending}</td>
                            <td className="px-4 py-4 font-bold text-rose-600">{formatINR(debit)}</td>
                            <td className="px-4 py-4 font-bold text-emerald-600">{formatINR(credit)}</td>
                            <td className="px-4 py-4 font-extrabold text-neutral-900">{formatINR(credit - debit)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead className="bg-neutral-50">
                      <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                        <th className="px-5 py-4">Type</th>
                        <th className="px-4 py-4">Amount (₹)</th>
                        <th className="px-4 py-4">Reason / Client</th>
                        <th className="px-4 py-4">Site</th>
                        <th className="px-4 py-4">Date</th>
                        <th className="px-4 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-semibold text-neutral-800">
                      {tableTransactions.map((tx) => (
                        <tr key={tx.id} className="border-t border-neutral-200 hover:bg-neutral-50/70">
                          <td className="px-5 py-4">
                            <span
                              className={[
                                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold',
                                tx.type === 'debit'
                                  ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
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
                          <td className="px-4 py-4 font-bold text-neutral-900">
                            {tx.type === 'debit' ? tx.reason : tx.client}
                          </td>
                          <td className="px-4 py-4 font-bold text-neutral-700">
                            {tx.type === 'credit' ? tx.site : '-'}
                          </td>
                          <td className="px-4 py-4 font-bold text-neutral-700">{tx.date}</td>
                          <td className="px-4 py-4 text-center">
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20"
                              aria-label="View transaction"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {viewMode !== 'pending' ? (
                <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-3 py-2.5 sm:px-4 md:gap-3 md:px-6 md:py-4">
                  <button
                    type="button"
                    className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 md:rounded-lg md:px-3 md:py-1.5 md:text-sm"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1 md:gap-2">
                    <button
                      type="button"
                      className="grid h-8 min-w-[2rem] place-items-center rounded-md bg-[#f39b03] text-xs font-bold text-white md:h-9 md:w-9 md:rounded-lg md:text-sm"
                    >
                      1
                    </button>
                    <button
                      type="button"
                      className="grid h-8 min-w-[2rem] place-items-center rounded-md border border-neutral-200 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-50 md:h-9 md:w-9 md:rounded-lg md:text-sm"
                    >
                      2
                    </button>
                    <button
                      type="button"
                      className="grid h-8 min-w-[2rem] place-items-center rounded-md border border-neutral-200 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-50 md:h-9 md:w-9 md:rounded-lg md:text-sm"
                    >
                      3
                    </button>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 md:rounded-lg md:px-3 md:py-1.5 md:text-sm"
                  >
                    Next
                  </button>
                </div>
              ) : null}
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
            src="/samarth-logo.png"
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
