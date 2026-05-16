import {
  Briefcase,
  Building2,
  CircleUserRound,
  ClipboardList,
  Landmark,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  Phone,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react'
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import http from './api/http'
import { AccountManagerSidebarBlock } from './AccountManagerSidebarBlock'
import { layoutBrandLogo } from './brandLogo'
import { CollaborationBrandMark } from './CollaborationBrandMark'
import { LayoutFooter } from './LayoutFooter'
import { CardShell } from './dashboardCards'
import { AppSelect } from './components/AppSelect'
import { HeaderYearSelect } from './components/HeaderYearSelect'
import { PageRefreshButton } from './components/PageRefreshButton'
import { useRefresh } from './context/RefreshContext'
import { useAuth } from './context/AuthContext'
import { getApiErrorMessage } from './api/request'
import { signOut } from './signOut'
import { notify, validateImageUpload } from './utils/notify'

type NavItem = {
  label: string
  icon: ReactNode
}

type SettingsProps = {
  onNavigate: (path: string) => void
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let u = 0
  let n = bytes
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024
    u += 1
  }
  const rounded = u === 0 || n >= 10 ? Math.round(n) : Number(n.toFixed(1))
  return `${rounded} ${units[u]}`
}

function formatBackupDate(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={[
        'flex items-center justify-between gap-3 rounded-xl px-2 py-1.5',
        disabled ? 'cursor-not-allowed opacity-55' : '',
      ].join(' ')}
    >
      <span className="truncate text-sm font-semibold text-neutral-800">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
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
  const { pathname } = useLocation()
  const { refreshTick } = useRefresh()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const displayName = user?.fullName?.trim() || user?.email || 'User'
  const companyLocked = !isSuperAdmin

  const [pageLoading, setPageLoading] = useState(true)
  const [saveBusy, setSaveBusy] = useState(false)

  // Company
  const [companyName, setCompanyName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [gstNumber, setGstNumber] = useState('')

  const [logoPreviewUrl, setLogoPreviewUrl] = useState(layoutBrandLogo)
  const [remoteLogoUrl, setRemoteLogoUrl] = useState<string | null>(null)
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl)
    }
  }, [logoObjectUrl])

  const triggerLogoPicker = () => logoInputRef.current?.click()

  // App preferences (company + user)
  const [currencyCode, setCurrencyCode] = useState('INR')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [uiTheme, setUiTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [languageCode, setLanguageCode] = useState('en')
  const [defaultMachine, setDefaultMachine] = useState<'Total Station' | 'DGPS'>('Total Station')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true)

  // Security
  const [currentPassword, setCurrentPassword] = useState('')
  const [changePassword, setChangePassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)

  // Backup & storage (from API)
  const [storageUsedBytes, setStorageUsedBytes] = useState(0)
  const [storageQuotaBytes, setStorageQuotaBytes] = useState(25 * 1024 ** 3)
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)
  const [storedFileCount, setStoredFileCount] = useState(0)

  // PDF / invoice
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [stampUrl, setStampUrl] = useState<string | null>(null)
  const signatureInputRef = useRef<HTMLInputElement | null>(null)
  const stampInputRef = useRef<HTMLInputElement | null>(null)

  const [invoiceTheme, setInvoiceTheme] = useState<'modern' | 'classic' | 'minimal'>('modern')
  const [footerNote, setFooterNote] = useState('')

  const [bdAccountName, setBdAccountName] = useState('')
  const [bdAccountNumber, setBdAccountNumber] = useState('')
  const [bdIfsc, setBdIfsc] = useState('')
  const [bdBankName, setBdBankName] = useState('')
  const [bdBranch, setBdBranch] = useState('')
  const [bdUpiPhone, setBdUpiPhone] = useState('')
  const [bdInvoiceSlot, setBdInvoiceSlot] = useState<string>('')
  const [bankSigPreview, setBankSigPreview] = useState<string | null>(null)
  const bankSigInputRef = useRef<HTMLInputElement | null>(null)

  const storagePercent =
    storageQuotaBytes > 0 ? Math.min(100, Math.round((storageUsedBytes / storageQuotaBytes) * 100)) : 0

  const loadSettings = useCallback(async () => {
    setPageLoading(true)
    try {
      const [coRes, meRes] = await Promise.all([
        http.get<{
          ok: boolean
          company: {
            name: string
            ownerName?: string
            contactPhone?: string
            email?: string
            officeAddress?: string
            gstNumber?: string
            settings?: {
              currency?: string
              dateFormat?: string
              defaultInstrumentTypeLabel?: string
              notificationsEnabled?: boolean
              autoBackupEnabled?: boolean
            }
            invoiceDefaults?: {
              theme?: string
              footerNote?: string
              signatureUrl?: string | null
              stampUrl?: string | null
            }
            branding?: { logoUrl?: string | null }
            storage?: {
              usedBytes: number
              quotaBytes: number
              lastBackupAt?: string | null
              fileCount: number
            }
          }
        }>('/api/settings/company'),
        http.get<{
          ok: boolean
          email: string
          profile?: { fullName?: string; phone?: string }
          preferences?: { theme?: string; language?: string }
          bankDetails?: {
            accountName?: string
            accountNumber?: string
            ifscCode?: string
            bankName?: string
            branch?: string
            upiPhone?: string
            invoiceSlot?: number
          }
          bankSignatureUrl?: string | null
        }>('/api/settings/me'),
      ])

      const c = coRes.data?.company
      if (c) {
        setCompanyName(c.name ?? '')
        setOwnerName(c.ownerName ?? '')
        setContactNumber(c.contactPhone ?? '')
        setEmailAddress(c.email ?? '')
        setOfficeAddress(c.officeAddress ?? '')
        setGstNumber(c.gstNumber ?? '')
        setCurrencyCode(c.settings?.currency ?? 'INR')
        setDateFormat(c.settings?.dateFormat ?? 'DD/MM/YYYY')
        const mach = c.settings?.defaultInstrumentTypeLabel ?? ''
        setDefaultMachine(mach.toLowerCase().includes('dgps') ? 'DGPS' : 'Total Station')
        setNotificationsEnabled(c.settings?.notificationsEnabled ?? true)
        setAutoBackupEnabled(c.settings?.autoBackupEnabled ?? true)

        const th = (c.invoiceDefaults?.theme ?? 'modern').toLowerCase()
        setInvoiceTheme(th === 'classic' ? 'classic' : th === 'minimal' ? 'minimal' : 'modern')
        setFooterNote(c.invoiceDefaults?.footerNote ?? '')
        setStampUrl(c.invoiceDefaults?.stampUrl ?? null)

        const logo = c.branding?.logoUrl
        setRemoteLogoUrl(logo ?? null)
        setLogoPreviewUrl(logo || layoutBrandLogo)

        if (c.storage) {
          setStorageUsedBytes(c.storage.usedBytes ?? 0)
          setStorageQuotaBytes(c.storage.quotaBytes ?? 25 * 1024 ** 3)
          setLastBackupAt(c.storage.lastBackupAt ? String(c.storage.lastBackupAt) : null)
          setStoredFileCount(c.storage.fileCount ?? 0)
        }
      }

      const me = meRes.data
      if (
        me?.preferences?.theme === 'light' ||
        me?.preferences?.theme === 'dark' ||
        me?.preferences?.theme === 'system'
      ) {
        setUiTheme(me.preferences.theme)
      }
      if (me?.preferences?.language) setLanguageCode(me.preferences.language)
      const bd = me?.bankDetails
      if (bd) {
        setBdAccountName(bd.accountName ?? '')
        setBdAccountNumber(bd.accountNumber ?? '')
        setBdIfsc(bd.ifscCode ?? '')
        setBdBankName(bd.bankName ?? '')
        setBdBranch(bd.branch ?? '')
        setBdUpiPhone(bd.upiPhone ?? '')
        setBdInvoiceSlot(bd.invoiceSlot === 1 || bd.invoiceSlot === 2 ? String(bd.invoiceSlot) : '')
      } else {
        setBdAccountName('')
        setBdAccountNumber('')
        setBdIfsc('')
        setBdBankName('')
        setBdBranch('')
        setBdUpiPhone('')
        setBdInvoiceSlot('')
      }
      setBankSigPreview(me?.bankSignatureUrl ?? null)
    } catch (err) {
      notify.apiError(err, 'Could not load settings.')
    } finally {
      setPageLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings, refreshTick])

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!isSuperAdmin) {
      notify.error('Only a super admin can change the company logo.')
      e.target.value = ''
      return
    }

    const imageError = validateImageUpload(file)
    if (imageError) {
      notify.error(imageError)
      e.target.value = ''
      return
    }

    if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl)
    const nextUrl = URL.createObjectURL(file)
    setLogoObjectUrl(nextUrl)
    setLogoPreviewUrl(nextUrl)

    const toastId = notify.loading('Uploading logo…')
    try {
      const fd = new FormData()
      fd.append('file', file)
      await http.post('/api/settings/company/logo', fd)
      URL.revokeObjectURL(nextUrl)
      setLogoObjectUrl(null)
      await loadSettings()
      notify.dismiss(toastId)
      notify.success('Logo uploaded successfully.')
    } catch (err) {
      URL.revokeObjectURL(nextUrl)
      setLogoObjectUrl(null)
      notify.dismiss(toastId)
      notify.apiError(err, 'Logo upload failed.')
      setLogoPreviewUrl(remoteLogoUrl || layoutBrandLogo)
    } finally {
      e.target.value = ''
    }
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
    { label: 'Sites', path: '/site-visits', icon: ClipboardList },
    // { label: 'Reports', path: '/reports', icon: FileBarChart },
    { label: 'Settings', path: '/settings', icon: Building2 },
  ] as const

  const handleUpdatePassword = async () => {
    if (!currentPassword.trim()) {
      notify.error('Please enter your current password.')
      return
    }
    if (!changePassword || !confirmPassword) {
      notify.error('Please fill in both new password fields.')
      return
    }
    if (changePassword !== confirmPassword) {
      notify.error('New passwords do not match.')
      return
    }
    if (changePassword.length < 8) {
      notify.error('New password must be at least 8 characters.')
      return
    }
    setPasswordBusy(true)
    const toastId = notify.loading('Updating password…')
    try {
      await http.post('/api/auth/change-password', {
        currentPassword,
        newPassword: changePassword,
      })
      notify.dismiss(toastId)
      notify.success('Password updated successfully.')
      setCurrentPassword('')
      setChangePassword('')
      setConfirmPassword('')
    } catch (err) {
      notify.dismiss(toastId)
      const msg = getApiErrorMessage(err, 'Could not update password.')
      notify.error(/current password is incorrect/i.test(msg) ? 'Current password is incorrect' : msg)
    } finally {
      setPasswordBusy(false)
    }
  }

  const handleSignaturePick = () => signatureInputRef.current?.click()
  const handleStampPick = () => stampInputRef.current?.click()

  const handleSignatureChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!isSuperAdmin) {
      notify.error('Only a super admin can upload invoice assets.')
      e.target.value = ''
      return
    }
    const imageError = validateImageUpload(f)
    if (imageError) {
      notify.error(imageError)
      e.target.value = ''
      return
    }
    const toastId = notify.loading('Uploading signature…')
    try {
      const fd = new FormData()
      fd.append('file', f)
      await http.post('/api/settings/company/invoice-signature', fd)
      await loadSettings()
      notify.dismiss(toastId)
      notify.success('Signature uploaded.')
    } catch (err) {
      notify.dismiss(toastId)
      notify.apiError(err, 'Signature upload failed.')
    } finally {
      e.target.value = ''
    }
  }

  const handleBankSignaturePick = () => bankSigInputRef.current?.click()

  const handleBankSignatureChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const imageError = validateImageUpload(f)
    if (imageError) {
      notify.error(imageError)
      e.target.value = ''
      return
    }
    const toastId = notify.loading('Uploading bank signature…')
    try {
      const fd = new FormData()
      fd.append('file', f)
      await http.post('/api/settings/me/bank-signature', fd)
      await loadSettings()
      notify.dismiss(toastId)
      notify.success('Bank signature uploaded.')
    } catch (err) {
      notify.dismiss(toastId)
      notify.apiError(err, 'Bank signature upload failed.')
    } finally {
      e.target.value = ''
    }
  }

  const handleStampChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!isSuperAdmin) {
      notify.error('Only a super admin can upload invoice assets.')
      e.target.value = ''
      return
    }
    const imageError = validateImageUpload(f)
    if (imageError) {
      notify.error(imageError)
      e.target.value = ''
      return
    }
    const toastId = notify.loading('Uploading stamp…')
    try {
      const fd = new FormData()
      fd.append('file', f)
      await http.post('/api/settings/company/invoice-stamp', fd)
      await loadSettings()
      notify.dismiss(toastId)
      notify.success('Stamp uploaded.')
    } catch (err) {
      notify.dismiss(toastId)
      notify.apiError(err, 'Stamp upload failed.')
    } finally {
      e.target.value = ''
    }
  }

  const handlePreviewInvoice = () => {
    const w = window.open('', '_blank')
    if (!w) {
      notify.error('Please allow pop-ups to preview the invoice.')
      return
    }
    const themeLabel =
      invoiceTheme === 'classic' ? 'Classic' : invoiceTheme === 'minimal' ? 'Minimal' : 'Modern'
    const logoSrc = logoPreviewUrl
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Invoice preview</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#f4f4f5;color:#111;}
  .sheet{max-width:720px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.08);overflow:hidden;}
  .modern header{border-bottom:4px solid #f39b03;}
  .classic header{border-bottom:2px solid #111;}
  .minimal header{border-bottom:1px solid #e5e5e5;}
  header{padding:20px 24px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
  .brand{display:flex;align-items:center;gap:14px;}
  .brand img{max-height:56px;max-width:160px;object-fit:contain;}
  h1{font-size:18px;margin:0;}
  .meta{font-size:12px;color:#52525b;margin-top:4px;}
  .body{padding:24px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{text-align:left;padding:10px 8px;border-bottom:1px solid #e4e4e7;color:#52525b;font-weight:600;}
  td{padding:10px 8px;border-bottom:1px solid #f4f4f5;}
  .footer{padding:16px 24px 28px;font-size:12px;color:#71717a;border-top:1px solid #f4f4f5;}
  .sig{display:flex;gap:24px;flex-wrap:wrap;margin-top:20px;align-items:flex-end;}
  .sig img{max-height:72px;max-width:160px;object-fit:contain;}
</style></head><body>
<div class="sheet ${invoiceTheme}">
  <header>
    <div class="brand">
      ${logoSrc ? `<img src="${esc(logoSrc)}" alt="Logo"/>` : ''}
      <div><h1>${esc(companyName || 'Company')}</h1>
      <div class="meta">${esc(emailAddress || '')}${officeAddress ? ` · ${esc(officeAddress)}` : ''}</div></div>
    </div>
    <div style="text-align:right;font-size:12px;"><strong>INVOICE</strong><div class="meta">Theme: ${esc(themeLabel)}</div></div>
  </header>
  <div class="body">
    <table>
      <thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>Sample survey line item</td><td>1</td><td>—</td></tr>
      </tbody>
    </table>
    <div class="sig">
      ${stampUrl ? `<div><div style="font-size:11px;color:#71717a;margin-bottom:4px;">Stamp</div><img src="${esc(stampUrl)}" alt="Stamp"/></div>` : ''}
    </div>
  </div>
  <div class="footer">${esc(footerNote || '')}</div>
</div></body></html>`
    w.document.write(html)
    w.document.close()
  }

  const handleCancel = () => {
    void loadSettings()
  }

  const handleSaveSettings = async () => {
    setSaveBusy(true)
    const toastId = notify.loading('Saving settings…')
    try {
      await http.patch('/api/settings/me', {
        preferences: {
          theme: uiTheme,
          language: languageCode,
        },
        bankDetails: {
          accountName: bdAccountName.trim(),
          accountNumber: bdAccountNumber.trim(),
          ifscCode: bdIfsc.trim(),
          bankName: bdBankName.trim(),
          branch: bdBranch.trim(),
          upiPhone: bdUpiPhone.trim(),
          invoiceSlot: bdInvoiceSlot === '1' || bdInvoiceSlot === '2' ? Number(bdInvoiceSlot) : null,
        },
      })
      if (isSuperAdmin) {
        await http.patch('/api/settings/company', {
          name: companyName.trim(),
          ownerName: ownerName.trim(),
          contactPhone: contactNumber.trim(),
          email: emailAddress.trim(),
          officeAddress: officeAddress.trim(),
          gstNumber: gstNumber.trim(),
          settings: {
            currency: currencyCode,
            dateFormat,
            defaultInstrumentTypeLabel: defaultMachine,
            notificationsEnabled,
            autoBackupEnabled,
          },
          invoiceDefaults: {
            theme: invoiceTheme,
            footerNote: footerNote.trim(),
          },
        })
      }
      notify.dismiss(toastId)
      notify.success('Settings saved successfully.')
      await loadSettings()
    } catch (err) {
      notify.dismiss(toastId)
      notify.apiError(err, 'Could not save settings.')
    } finally {
      setSaveBusy(false)
    }
  }

  const handleCreateBackup = async () => {
    if (!isSuperAdmin) return
    try {
      await http.post('/api/settings/company/backup')
      await loadSettings()
      notify.success('Backup recorded.')
    } catch (err) {
      notify.apiError(err, 'Could not record backup.')
    }
  }

  const handleDownloadBackup = async () => {
    if (!isSuperAdmin) return
    try {
      const res = await http.get('/api/settings/company/backup-export', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'survey-company-backup.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      notify.apiError(err, 'Could not download backup.')
    }
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
                <div className="mt-3 text-base font-extrabold text-white">Er. {displayName}</div>
                <div className="mt-1 text-xs font-semibold text-white/65">
                  {isSuperAdmin ? 'Super admin' : 'Admin'}
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                {user?.email ? (
                  <div className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-white/90">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f39b03]">
                      <Mail size={15} />
                    </span>
                    <span className="min-w-0 truncate">{user.email}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-white/50">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f39b03]">
                      <Mail size={15} />
                    </span>
                    <span className="min-w-0 truncate">—</span>
                  </div>
                )}
                {user?.phone ? (
                  <div className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-white/90">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f39b03]">
                      <Phone size={15} />
                    </span>
                    <span>{user.phone}</span>
                  </div>
                ) : null}
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
                { label: 'Visits', path: '/site-visits', icon: ClipboardList },
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
                    path === '/settings'
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
                <PageRefreshButton variant="onDark" />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                <h1 className="min-w-0 truncate text-left text-base font-extrabold leading-tight tracking-tight text-white">
                  Settings
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
                  Settings
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
                    <div className="truncate text-xs font-extrabold text-neutral-900 sm:text-sm">{displayName}</div>
                    <div className="text-[11px] font-semibold text-neutral-600">
                      {isSuperAdmin ? 'Super admin' : 'Admin'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white p-3 pb-[calc(3.65rem+max(10px,env(safe-area-inset-bottom,0px)))] sm:px-5 sm:pt-5 sm:pb-[calc(3.65rem+max(10px,env(safe-area-inset-bottom,0px)))] md:p-6 md:pb-24 lg:p-8 lg:pb-28">
            <section className="mx-auto w-full max-w-[1600px]">
              {pageLoading ? (
                <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-600">
                  Loading settings…
                </div>
              ) : (
                <>
              <div className="grid grid-cols-1 gap-3 md:gap-5 xl:grid-cols-2">
                {/* Company Information */}
                <div className="xl:col-span-2">
                  <CardShell title="Company Details">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start lg:gap-6">
                      <div className="min-w-0">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label="Company Name">
                            <input
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              disabled={companyLocked}
                              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
                            />
                          </Field>
                          <Field label="Owner Name">
                            <input
                              value={ownerName}
                              onChange={(e) => setOwnerName(e.target.value)}
                              disabled={companyLocked}
                              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
                            />
                          </Field>
                          <Field label="Contact Number">
                            <input
                              value={contactNumber}
                              onChange={(e) => setContactNumber(e.target.value)}
                              placeholder="+91 ... "
                              disabled={companyLocked}
                              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
                            />
                          </Field>
                          <Field label="Email Address">
                            <input
                              value={emailAddress}
                              onChange={(e) => setEmailAddress(e.target.value)}
                              placeholder="name@company.com"
                              disabled={companyLocked}
                              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
                            />
                          </Field>
                          <Field label="Office Address">
                            <textarea
                              value={officeAddress}
                              onChange={(e) => setOfficeAddress(e.target.value)}
                              rows={3}
                              placeholder="Office location and address details"
                              disabled={companyLocked}
                              className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 sm:col-span-2"
                            />
                          </Field>
                          <Field label="GST Number (optional)">
                            <input
                              value={gstNumber}
                              onChange={(e) => setGstNumber(e.target.value)}
                              placeholder="GSTIN"
                              disabled={companyLocked}
                              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
                            />
                          </Field>
                        </div>
                      </div>

                      <div className="min-w-0 shrink-0 lg:max-w-none">
                        <div className="rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm md:p-3">
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
                          disabled={companyLocked}
                          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-extrabold text-neutral-800 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Change Logo
                        </button>
                        <p className="mt-3 text-[11px] font-medium leading-relaxed text-neutral-500">
                          The bundled default logo (<span className="font-semibold text-neutral-700">src/assets/logo.jpeg</span>),
                          including the artwork used for app icons and PWA install graphics, incorporates material sourced from{' '}
                          <a
                            href="https://www.flaticon.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-[#f39b03] underline-offset-2 hover:underline"
                          >
                            Flaticon
                          </a>
                          . Flaticon’s license requires attribution; cite the designer name from your icon download page if you
                          substitute a different graphic.
                        </p>
                        </div>
                      </div>
                    </div>
                  </CardShell>
                </div>

                {/* Account & Security */}
                <div className="xl:col-span-2">
                  <CardShell
                    title="Security Settings"
                    leadingIcon={<ShieldCheck size={18} strokeWidth={2.25} />}
                  >
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div className="grid gap-3 md:pr-4">
                        <Field label="Current password">
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            autoComplete="current-password"
                            placeholder="Current password"
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          />
                        </Field>
                        <Field label="New password">
                          <input
                            type="password"
                            value={changePassword}
                            onChange={(e) => setChangePassword(e.target.value)}
                            autoComplete="new-password"
                            placeholder="At least 8 characters"
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          />
                        </Field>
                        <Field label="Confirm new password">
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            placeholder="Confirm new password"
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                          />
                        </Field>
                      </div>

                      <div className="flex flex-col justify-between gap-3 md:items-end">
                        <div className="w-full">
                          <button
                            type="button"
                            onClick={() => void handleUpdatePassword()}
                            disabled={passwordBusy}
                            className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-6 text-sm font-extrabold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {passwordBusy ? 'Updating…' : 'Update password'}
                          </button>
                        </div>

                        <div className="w-full text-left text-xs font-semibold text-neutral-500">
                          Enter your current password, then choose a new password (minimum 8 characters).
                        </div>
                      </div>
                    </div>
                  </CardShell>
                </div>

                {/* Personal bank details (invoice PDF footer) */}
                <div className="xl:col-span-2">
                  <CardShell
                    title="Your bank details (invoice PDF)"
                    leadingIcon={<Landmark size={18} strokeWidth={2.25} />}
                  >
                    <p className="text-xs font-semibold leading-relaxed text-neutral-600">
                      These details appear in the dual-column bank block at the bottom of generated invoices. Choose{' '}
                      <span className="font-extrabold text-neutral-800">Left column</span> or{' '}
                      <span className="font-extrabold text-neutral-800">Right column</span> so each signatory maps to the
                      correct side (two different users should use slot 1 and slot 2).
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Account name">
                        <input
                          value={bdAccountName}
                          onChange={(e) => setBdAccountName(e.target.value)}
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        />
                      </Field>
                      <Field label="Account number">
                        <input
                          value={bdAccountNumber}
                          onChange={(e) => setBdAccountNumber(e.target.value)}
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        />
                      </Field>
                      <Field label="IFSC code">
                        <input
                          value={bdIfsc}
                          onChange={(e) => setBdIfsc(e.target.value)}
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        />
                      </Field>
                      <Field label="Bank name (optional)">
                        <input
                          value={bdBankName}
                          onChange={(e) => setBdBankName(e.target.value)}
                          placeholder="Shown in parentheses after IFSC"
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        />
                      </Field>
                      <Field label="Branch">
                        <input
                          value={bdBranch}
                          onChange={(e) => setBdBranch(e.target.value)}
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        />
                      </Field>
                      <Field label="Google Pay / PhonePe number">
                        <input
                          value={bdUpiPhone}
                          onChange={(e) => setBdUpiPhone(e.target.value)}
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                        />
                      </Field>
                      <Field label="Position on invoice PDF">
                        <AppSelect
                          value={bdInvoiceSlot}
                          onChange={setBdInvoiceSlot}
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus-within:border-[#f39b03]/80 focus-within:ring-2 focus-within:ring-[#f39b03]/20"
                          options={[
                            { value: '', label: 'Not shown as a column (omit from dual block)' },
                            { value: '1', label: 'Left column' },
                            { value: '2', label: 'Right column' },
                          ]}
                        />
                      </Field>
                    </div>
                  </CardShell>
                </div>

                {/* Backup & Storage */}
                <CardShell title="Backup & Storage">
                  <div className="grid gap-4">
                    <p className="text-xs font-semibold leading-relaxed text-neutral-600">
                      Storage totals include all files registered for your company (including Cloudinary uploads such as visit
                      photos and invoice assets). Quota is configured on the server.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-neutral-100 bg-white p-2.5 md:p-3">
                        <div className="text-xs font-extrabold text-neutral-900">Storage used</div>
                        <div className="mt-1 text-sm font-extrabold text-neutral-950">
                          {formatBytes(storageUsedBytes)} / {formatBytes(storageQuotaBytes)}
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-neutral-500">
                          {storedFileCount} file{storedFileCount === 1 ? '' : 's'} tracked
                        </div>
                      </div>
                      <div className="rounded-xl border border-neutral-100 bg-white p-2.5 md:p-3">
                        <div className="text-xs font-extrabold text-neutral-900">Backup status</div>
                        <div className="mt-1 text-sm font-extrabold text-neutral-950">
                          Last backup: {formatBackupDate(lastBackupAt)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-neutral-100 bg-white p-2.5 md:p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-extrabold text-neutral-900">Storage progress</div>
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
                        onClick={() => void handleCreateBackup()}
                        disabled={!isSuperAdmin}
                        className="h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Record backup
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownloadBackup()}
                        disabled={!isSuperAdmin}
                        className="h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:border-[#f39b03]/40 hover:text-[#f39b03] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Download backup (JSON)
                      </button>
                      <button
                        type="button"
                        disabled={!isSuperAdmin}
                        className="h-11 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 text-sm font-semibold text-neutral-600 sm:col-span-2"
                      >
                        Manage storage in Cloudinary Dashboard (super admin)
                      </button>
                    </div>
                  </div>
                </CardShell>

                {/* PDF & Invoice Preferences */}
                <CardShell title="PDF & invoice">
                  <div className="grid gap-4">
                    <p className="text-xs font-semibold text-neutral-600">
                      Invoice PDFs use the company stamp asset bundled with the app (Authorised Signatory block).
                    </p>
                    <Field label="Footer note">
                      <textarea
                        value={footerNote}
                        onChange={(e) => setFooterNote(e.target.value)}
                        disabled={companyLocked}
                        rows={4}
                        placeholder="Shown at the bottom of PDF invoices"
                        className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 disabled:cursor-not-allowed disabled:bg-neutral-50"
                      />
                    </Field>
                  </div>
                </CardShell>
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2.5 max-md:mb-4 max-md:px-1 max-md:pb-4 sm:flex-row sm:items-center sm:justify-between md:mb-0 md:px-0 md:pb-0">
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
                  disabled={saveBusy}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f39b03] px-8 text-sm font-extrabold text-white transition hover:bg-[#e18e03] disabled:opacity-60"
                >
                  {saveBusy ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
                </>
              )}
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

      <LayoutFooter />
    </div>
  )
}

