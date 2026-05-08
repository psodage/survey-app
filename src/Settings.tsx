import {
  Bell,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  Phone,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { signOut } from './signOut'

type NavItem = {
  label: string
  icon: ReactNode
}

type SettingsProps = {
  onNavigate: (path: string) => void
}

function CardShell({
  title,
  leadingIcon,
  children,
}: {
  title: string
  leadingIcon?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 md:rounded-2xl md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {leadingIcon ? (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f39b03]/12 text-[#f39b03] ring-1 ring-[#f39b03]/20">
              {leadingIcon}
            </span>
          ) : null}
          <div className="truncate text-xs font-extrabold tracking-tight text-neutral-900 md:text-sm">
            {title}
          </div>
        </div>
      </div>
      <div className="p-3 sm:p-4 md:p-6">{children}</div>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5">
      <span className="truncate text-sm font-semibold text-neutral-800">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
        aria-label={label}
      />
      <div
        className={[
          'relative h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-[#f39b03]' : 'bg-neutral-200',
        ].join(' ')}
      >
        <span
          className={[
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </div>
    </label>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold text-neutral-700">{label}</span>
      {children}
    </label>
  )
}

export default function Settings({ onNavigate }: SettingsProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Company
  const [companyName, setCompanyName] = useState('Samarth Land Surveyors')
  const [ownerName, setOwnerName] = useState('Er. Shubham Bhoi')
  const [contactNumber, setContactNumber] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [gstNumber, setGstNumber] = useState('')

  const [logoPreviewUrl, setLogoPreviewUrl] = useState('/samarth-logo.png')
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl)
    }
  }, [logoObjectUrl])

  const triggerLogoPicker = () => logoInputRef.current?.click()

  // App preferences
  const [currency, setCurrency] = useState('INR (₹)')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [defaultTheme, setDefaultTheme] = useState('Dark')
  const [language, setLanguage] = useState('English')
  const [defaultMachine, setDefaultMachine] = useState<'Total Station' | 'DGPS'>('Total Station')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true)
  const [darkModeEnabled, setDarkModeEnabled] = useState(false)

  // Security
  const [changePassword, setChangePassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Backup & storage
  const storageUsedGb = 12
  const storageTotalGb = 25
  const storagePercent = Math.round((storageUsedGb / storageTotalGb) * 100)
  const lastBackupLabel = '20 May 2025'

  // PDF settings
  const [signatureLabel, setSignatureLabel] = useState('No file selected')
  const [stampLabel, setStampLabel] = useState('No file selected')
  const signatureInputRef = useRef<HTMLInputElement | null>(null)
  const stampInputRef = useRef<HTMLInputElement | null>(null)

  const [invoiceTheme, setInvoiceTheme] = useState('Modern')
  const [footerNote, setFooterNote] = useState('Thank you for choosing Samarth Land Surveyors.')

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl)
    const nextUrl = URL.createObjectURL(file)
    setLogoObjectUrl(nextUrl)
    setLogoPreviewUrl(nextUrl)
    e.target.value = ''
  }

  const navItems: NavItem[] = [
    { label: 'Dashboard', icon: <LayoutGrid size={16} /> },
    { label: 'Account Manager', icon: <Briefcase size={16} /> },
    { label: 'Clients & Sites', icon: <UsersRound size={16} /> },
    { label: 'Site Visits', icon: <ClipboardList size={16} /> },
    { label: 'Measurement', icon: <Calculator size={16} /> },
    { label: 'Settings', icon: <Building2 size={16} /> },
    { label: 'Log Out', icon: <LogOut size={16} /> },
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
    { label: 'Sites', path: '/site-visits', icon: ClipboardList },
    { label: 'Measure', path: '/measurement-rate-calculator', icon: Calculator },
    { label: 'Settings', path: '/settings', icon: Building2 },
  ] as const

  const handleUpdatePassword = () => {
    if (!changePassword || !confirmPassword) {
      window.alert('Please fill in both password fields.')
      return
    }
    if (changePassword !== confirmPassword) {
      window.alert('Passwords do not match.')
      return
    }
    window.alert('Password updated successfully (mock).')
    setChangePassword('')
    setConfirmPassword('')
  }

  const handleLogoutAllDevices = async () => {
    const ok = window.confirm('Logout from all devices?')
    if (!ok) return
    await signOut()
    onNavigate('/login')
  }

  const handleSignaturePick = () => signatureInputRef.current?.click()
  const handleStampPick = () => stampInputRef.current?.click()

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setSignatureLabel(f.name)
    e.target.value = ''
  }

  const handleStampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setStampLabel(f.name)
    e.target.value = ''
  }

  const handlePreviewInvoice = () => {
    window.alert('Invoice preview (mock).')
  }

  const handleCancel = () => {
    window.alert('Changes discarded (mock).')
  }

  const handleSaveSettings = () => {
    window.alert('Settings saved successfully (mock).')
  }

  return (
    <div className="flex h-[100svh] max-h-[100svh] min-h-[100svh] flex-col overflow-hidden bg-black md:h-dvh md:max-h-dvh md:min-h-dvh md:bg-neutral-100">
      <div className="flex min-h-0 flex-1 w-full max-w-none">
        {/* Sidebar */}
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
                const active = item.label === 'Settings'
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
                { label: 'Visits', path: '/site-visits', icon: ClipboardList },
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
                  Settings
                </h1>
                <button
                  type="button"
                  className="relative inline-flex max-w-[58vw] shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-neutral-900 py-2 pl-2.5 pr-8 text-left text-[11px] font-semibold leading-tight text-white outline-none transition hover:bg-neutral-800 focus:border-[#f39b03]/70 focus:ring-2 focus:ring-[#f39b03]/20"
                  aria-label="Selected date"
                >
                  <Calendar size={13} className="shrink-0 text-[#f39b03]" />
                  <span className="truncate">20 May 2025</span>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/80"
                  />
                </button>
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
                  Settings
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 outline-none transition hover:border-neutral-300 sm:px-4 sm:py-2.5 sm:text-sm"
                  aria-label="Select date"
                >
                  <Calendar size={16} className="text-[#f39b03]" />
                  <span className="whitespace-nowrap">20 May 2025</span>
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

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-3 pb-[calc(3.65rem+max(10px,env(safe-area-inset-bottom,0px)))] sm:px-5 sm:pt-5 sm:pb-[calc(3.65rem+max(10px,env(safe-area-inset-bottom,0px)))] md:p-6 md:pb-24 lg:p-8 lg:pb-28">
            <section className="mx-auto w-full max-w-[1400px]">
              <div className="grid grid-cols-1 gap-3 md:gap-5 xl:grid-cols-2">
                {/* Company Information */}
                <CardShell title="Company Details">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Company Name">
                          <input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          />
                        </Field>
                        <Field label="Owner Name">
                          <input
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          />
                        </Field>
                        <Field label="Contact Number">
                          <input
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                            placeholder="+91 ... "
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          />
                        </Field>
                        <Field label="Email Address">
                          <input
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            placeholder="name@company.com"
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          />
                        </Field>
                        <Field label="Office Address">
                          <textarea
                            value={officeAddress}
                            onChange={(e) => setOfficeAddress(e.target.value)}
                            rows={3}
                            placeholder="Office location and address details"
                            className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          />
                        </Field>
                        <Field label="GST Number (optional)">
                          <input
                            value={gstNumber}
                            onChange={(e) => setGstNumber(e.target.value)}
                            placeholder="GSTIN"
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="md:col-span-1">
                      <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                        <div className="text-xs font-extrabold tracking-tight text-neutral-900">Logo Upload</div>
                        <div className="mt-3 aspect-[4/3] overflow-hidden rounded-xl bg-neutral-50 ring-1 ring-black/5">
                          <img
                            src={logoPreviewUrl}
                            alt="Company Logo Preview"
                            className="h-full w-full object-contain p-3"
                            draggable={false}
                          />
                        </div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg"
                          className="sr-only"
                          onChange={handleLogoChange}
                        />
                        <button
                          type="button"
                          onClick={triggerLogoPicker}
                          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-extrabold text-neutral-800 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03]"
                        >
                          Change Logo
                        </button>
                      </div>
                    </div>
                  </div>
                </CardShell>

                {/* Application Preferences */}
                <CardShell title="Application Settings">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Currency">
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-white px-3 pr-10 text-sm font-semibold text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        >
                          <option>INR (₹)</option>
                          <option>USD ($)</option>
                          <option>EUR (€)</option>
                        </select>
                      </Field>

                      <Field label="Date Format">
                        <select
                          value={dateFormat}
                          onChange={(e) => setDateFormat(e.target.value)}
                          className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-white px-3 pr-10 text-sm font-semibold text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        >
                          <option>DD/MM/YYYY</option>
                          <option>MM/DD/YYYY</option>
                          <option>YYYY-MM-DD</option>
                        </select>
                      </Field>

                      <Field label="Default Theme">
                        <select
                          value={defaultTheme}
                          onChange={(e) => setDefaultTheme(e.target.value)}
                          className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-white px-3 pr-10 text-sm font-semibold text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        >
                          <option>Dark</option>
                          <option>Light</option>
                        </select>
                      </Field>

                      <Field label="Language">
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-white px-3 pr-10 text-sm font-semibold text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        >
                          <option>English</option>
                          <option>Hindi</option>
                          <option>Marathi</option>
                        </select>
                      </Field>

                      <div className="sm:col-span-2">
                        <div className="grid gap-2">
                          <span className="text-xs font-bold text-neutral-700">Default Machine</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setDefaultMachine('Total Station')}
                              className={[
                                'h-11 rounded-xl border px-3 text-sm font-extrabold transition',
                                defaultMachine === 'Total Station'
                                  ? 'border-[#f39b03]/60 bg-[#f39b03]/10 text-[#f39b03]'
                                  : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300',
                              ].join(' ')}
                            >
                              Total Station
                            </button>
                            <button
                              type="button"
                              onClick={() => setDefaultMachine('DGPS')}
                              className={[
                                'h-11 rounded-xl border px-3 text-sm font-extrabold transition',
                                defaultMachine === 'DGPS'
                                  ? 'border-[#f39b03]/60 bg-[#f39b03]/10 text-[#f39b03]'
                                  : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300',
                              ].join(' ')}
                            >
                              DGPS
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-neutral-100 bg-white px-3 py-2.5">
                      <div className="text-xs font-extrabold tracking-tight text-neutral-900">Toggle Switches</div>
                      <div className="mt-3 grid gap-2">
                        <ToggleRow
                          label="Enable Notifications"
                          checked={notificationsEnabled}
                          onChange={setNotificationsEnabled}
                        />
                        <ToggleRow label="Enable Auto Backup" checked={autoBackupEnabled} onChange={setAutoBackupEnabled} />
                        <ToggleRow label="Enable Dark Mode" checked={darkModeEnabled} onChange={setDarkModeEnabled} />
                      </div>
                    </div>
                  </div>
                </CardShell>

                {/* Account & Security */}
                <div className="xl:col-span-2">
                  <CardShell
                    title="Security Settings"
                    leadingIcon={<ShieldCheck size={18} strokeWidth={2.25} />}
                  >
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div className="grid gap-3 md:pr-4">
                        <Field label="Change Password">
                          <input
                            type="password"
                            value={changePassword}
                            onChange={(e) => setChangePassword(e.target.value)}
                            placeholder="Enter new password"
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          />
                        </Field>
                        <Field label="Confirm Password">
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          />
                        </Field>
                      </div>

                      <div className="flex flex-col justify-between gap-3 md:items-end">
                        <div className="w-full">
                          <button
                            type="button"
                            onClick={handleUpdatePassword}
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-6 text-sm font-extrabold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03]"
                          >
                            Update Password
                          </button>
                        </div>
                        <div className="w-full">
                          <button
                            type="button"
                            onClick={handleLogoutAllDevices}
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-6 text-sm font-extrabold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03]"
                          >
                            Logout from All Devices
                          </button>
                        </div>
                        <div className="w-full text-left text-xs font-semibold text-neutral-500">
                          For security reasons, password updates require confirmation (mock UI).
                        </div>
                      </div>
                    </div>
                  </CardShell>
                </div>

                {/* Backup & Storage */}
                <CardShell title="Backup & Storage">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-neutral-100 bg-white p-3">
                        <div className="text-xs font-extrabold text-neutral-900">Storage Used</div>
                        <div className="mt-1 text-sm font-extrabold text-neutral-950">
                          {storageUsedGb} GB / {storageTotalGb} GB
                        </div>
                      </div>
                      <div className="rounded-xl border border-neutral-100 bg-white p-3">
                        <div className="text-xs font-extrabold text-neutral-900">Backup Status</div>
                        <div className="mt-1 text-sm font-extrabold text-neutral-950">
                          Last backup: {lastBackupLabel}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-neutral-100 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-extrabold text-neutral-900">Storage Progress</div>
                        <div className="text-xs font-extrabold text-[#f39b03]">{storagePercent}%</div>
                      </div>
                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-100 ring-1 ring-black/5">
                        <div
                          className="h-full rounded-full bg-[#f39b03]"
                          style={{ width: `${storagePercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        className="h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03]"
                      >
                        Create Backup
                      </button>
                      <button
                        type="button"
                        className="h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03]"
                      >
                        Download Backup
                      </button>
                      <button
                        type="button"
                        className="h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03] sm:col-span-2"
                      >
                        Manage Storage
                      </button>
                    </div>
                  </div>
                </CardShell>

                {/* PDF & Invoice Preferences */}
                <CardShell title="PDF Settings">
                  <div className="grid gap-4">
                    <div className="rounded-xl border border-neutral-100 bg-white p-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                          <div className="text-xs font-extrabold text-neutral-900">Upload Signature</div>
                          <div className="mt-2 text-xs font-semibold text-neutral-500">
                            {signatureLabel}
                          </div>
                          <button
                            type="button"
                            onClick={handleSignaturePick}
                            className="mt-3 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-extrabold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03]"
                          >
                            Upload Signature
                          </button>
                          <input
                            ref={signatureInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleSignatureChange}
                          />
                        </div>

                        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                          <div className="text-xs font-extrabold text-neutral-900">Upload Stamp</div>
                          <div className="mt-2 text-xs font-semibold text-neutral-500">
                            {stampLabel}
                          </div>
                          <button
                            type="button"
                            onClick={handleStampPick}
                            className="mt-3 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-extrabold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03]"
                          >
                            Upload Stamp
                          </button>
                          <input
                            ref={stampInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleStampChange}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Select Invoice Theme">
                        <select
                          value={invoiceTheme}
                          onChange={(e) => setInvoiceTheme(e.target.value)}
                          className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-white px-3 pr-10 text-sm font-semibold text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        >
                          <option>Modern</option>
                          <option>Classic</option>
                          <option>Minimal</option>
                        </select>
                      </Field>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handlePreviewInvoice}
                          className="h-11 w-full rounded-xl border border-[#f39b03]/60 bg-[#f39b03]/10 px-4 text-sm font-extrabold text-[#f39b03] shadow-sm ring-1 ring-[#f39b03]/20 transition hover:bg-[#f39b03]/15"
                        >
                          Preview Invoice
                        </button>
                      </div>
                    </div>

                    <Field label="Footer Note">
                      <textarea
                        value={footerNote}
                        onChange={(e) => setFooterNote(e.target.value)}
                        rows={4}
                        className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                      />
                    </Field>
                  </div>
                </CardShell>
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-[#f39b03]/50 bg-white px-6 text-sm font-extrabold text-[#f39b03] shadow-sm ring-1 ring-black/5 transition hover:bg-[#f39b03]/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f39b03] px-8 text-sm font-extrabold text-white shadow-[0_10px_30px_rgba(243,155,3,0.25)] transition hover:bg-[#e18e03]"
                >
                  Save Settings
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Fixed Bottom Footer (tablet/desktop) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex w-full flex-col border-t border-white/10 bg-black [transform:translate3d(0,0,0)] md:hidden"
        aria-label="Mobile primary navigation"
      >
        <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-0 px-1 pt-1.5 pb-1">
          {mobileBottomNav.map((item) => {
            const active = item.path === '/settings'
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

