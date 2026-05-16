import {
  ArrowRight,
  ArrowLeft,
  CircleUserRound,
  LogOut,
  Menu,
  Plus,
  UsersRound,
  LayoutGrid,
  Briefcase,
  ClipboardList,
  Building2,
  Eye,
  Mail,
  MapPin,
  Phone,
  X,
  IndianRupee,
  Trash2,
} from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  CardPanel,
  CardShell,
  StatCard,
  toolbarPlusIconClass,
  toolbarPrimaryButtonClass,
  toolbarSearchInputClass,
  toolbarSecondaryButtonClass,
} from './dashboardCards'
import { AccountManagerSidebarBlock } from './AccountManagerSidebarBlock'
import { AddSiteForm } from './AddSiteForm'
import { HeaderYearSelect } from './components/HeaderYearSelect'
import { PageRefreshButton } from './components/PageRefreshButton'
import { useRefresh } from './context/RefreshContext'
import { CollaborationBrandMark } from './CollaborationBrandMark'
import { LayoutFooter } from './LayoutFooter'
import { useSelectedYear } from './context/SelectedYearContext'
import axios from 'axios'
import { toast } from 'sonner'
import http from './api/http'
import { useAuth } from './context/AuthContext'
import { signOut } from './signOut'
import { ConfirmAlert } from './ConfirmAlert'
import { AppSelect } from './components/AppSelect'
import { TablePagination } from './components/TablePagination'
import {
  exportAllClientsExcel,
  exportAllClientsPdf,
  exportClientExcel,
  exportClientPdf,
} from './utils/exportClientsReport'
import { runExport } from './utils/runExport'

const CLIENT_PAGE_SIZE = 10

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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function parseCurrency(value: string) {
  // Examples: "₹1,40,000", "₹0", "85,000"
  return Number(value.replace(/[^\d.-]/g, '')) || 0
}

function formatRupee(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

const actionTrashButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100'
const actionTrashButtonClassMobile =
  'inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 md:h-8 md:w-8'

type ClientRow = {
  id?: string
  name: string
  phone: string
  sites: number
  revenue: string
  received: string
  pending: string
}

type SiteRow = {
  id?: string
  name: string
  location: string
  lastVisit: string
  status: 'Active' | 'On Hold' | 'Completed'
  received: string
  pending: string
}

type ClientsSitesProps = {
  onNavigate: (path: string) => void
}

export default function ClientsSites({ onNavigate }: ClientsSitesProps) {
  const { token, user } = useAuth()
  const { selectedYear } = useSelectedYear()
  const { refreshTick } = useRefresh()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<ClientRow[]>([])
  const [clientSitesMap, setClientSitesMap] = useState<Record<string, SiteRow[]>>({})
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null)
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false)
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false)
  const [sitesSearchQuery, setSitesSearchQuery] = useState('')
  const [clientPendingFilter, setClientPendingFilter] = useState<'all' | 'withPending' | 'cleared'>('all')
  const [siteStatusFilter, setSiteStatusFilter] = useState<'all' | SiteRow['status']>('all')
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [addClientError, setAddClientError] = useState('')
  const [pendingDeleteClient, setPendingDeleteClient] = useState<ClientRow | null>(null)
  const [deleteClientBusy, setDeleteClientBusy] = useState(false)
  const [pendingDeleteSite, setPendingDeleteSite] = useState<{ id: string; name: string; clientName: string } | null>(
    null,
  )
  const [deleteSiteBusy, setDeleteSiteBusy] = useState(false)
  const [clientPage, setClientPage] = useState(1)
  const [exportBusy, setExportBusy] = useState(false)
  const prevSelectedClientNameRef = useRef<string | null>(null)
  const location = useLocation()

  const refreshClientsAndSites = useCallback(async () => {
    if (!token) return
    try {
      const [cRes, sRes] = await Promise.all([
        http.get<{
          ok: boolean
          clients: Array<{
            id: string
            name: string
            phone: string
            sites: number
            revenue: string
            received: string
            pending: string
          }>
        }>('/api/clients', { params: { year: selectedYear } }),
        http.get<{
          ok: boolean
          sites: Array<{
            id: string
            clientName: string
            name: string
            location: string
            lastVisit: string
            status: string
            received: string
            pending: string
          }>
        }>('/api/sites', { params: { year: selectedYear } }),
      ])
      if (cRes.data?.ok) {
        setClients(
          cRes.data.clients.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            sites: c.sites,
            revenue: c.revenue,
            received: c.received,
            pending: c.pending,
          })),
        )
      }
      const grouped: Record<string, SiteRow[]> = {}
      if (sRes.data?.ok) {
        for (const s of sRes.data.sites) {
          if (!grouped[s.clientName]) grouped[s.clientName] = []
          grouped[s.clientName].push({
            id: s.id,
            name: s.name,
            location: s.location,
            lastVisit: s.lastVisit,
            status: s.status as SiteRow['status'],
            received: s.received ?? '₹0',
            pending: s.pending,
          })
        }
      }
      setClientSitesMap(grouped)
    } catch {
      toast.error('Could not load clients or sites.')
    }
  }, [token, selectedYear, refreshTick])

  useEffect(() => {
    void refreshClientsAndSites()
  }, [refreshClientsAndSites])

  const searchParams = new URLSearchParams(location.search)
  const summary = searchParams.get('summary') ?? ''
  const requestedClient = searchParams.get('client') ?? ''
  const showAllSites = summary === 'total-sites'

  useEffect(() => {
    // If we arrived here via `?summary=...` (Dashboard tiles), ensure we show the
    // corresponding list view, not a previously selected client detail.
    if (!summary) return
    setSelectedClientName(null)
    setQuery('')
  }, [summary])

  useEffect(() => {
    if (!requestedClient || summary) return
    const matchedClient = clients.find((client) => client.name === requestedClient)
    if (!matchedClient) return
    setSelectedClientName(matchedClient.name)
    setQuery('')
  }, [requestedClient, summary, clients])

  useEffect(() => {
    setSitesSearchQuery('')
  }, [selectedClientName])

  useEffect(() => {
    if (prevSelectedClientNameRef.current && !selectedClientName) {
      setPendingDeleteClient(null)
      setPendingDeleteSite(null)
    }
    prevSelectedClientNameRef.current = selectedClientName
  }, [selectedClientName])

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

  const selectedClient = useMemo(() => {
    if (!selectedClientName) return null
    return clients.find((c) => c.name === selectedClientName) ?? null
  }, [selectedClientName, clients])

  const selectedSites = useMemo(() => {
    if (!selectedClientName) return []
    return clientSitesMap[selectedClientName] ?? []
  }, [selectedClientName, clientSitesMap])

  const filteredSitesForClient = useMemo(() => {
    const q = sitesSearchQuery.trim().toLowerCase()
    return selectedSites.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q) ||
        s.pending.toLowerCase().includes(q) ||
        s.lastVisit.toLowerCase().includes(q)

      const matchesStatus = siteStatusFilter === 'all' || s.status === siteStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [selectedSites, siteStatusFilter, sitesSearchQuery])

  const allSites = useMemo(() => {
    return (Object.entries(clientSitesMap) as [string, SiteRow[]][]).flatMap(([clientName, sites]) =>
      sites.map((site) => ({
        ...site,
        clientName,
      })),
    )
  }, [clientSitesMap])

  const filteredAllSites = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allSites.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.clientName.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q)
      const matchesStatus = siteStatusFilter === 'all' || s.status === siteStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [allSites, query, siteStatusFilter])

  const handleSummaryCardClick = (summary: 'total-clients' | 'total-sites' | 'total-revenue' | 'pending' | 'received') => {
    // Ensure we always open the list view (not a previously selected client detail view).
    setSelectedClientName(null)
    setQuery('')

    const search =
      summary === 'total-clients' ? '' : `?summary=${summary}`

    onNavigate(`/clients-sites${search}`)
  }

  const handleBackFromClientDetails = () => {
    setSelectedClientName(null)
    setQuery('')
    setSitesSearchQuery('')
    const nextParams = new URLSearchParams(location.search)
    nextParams.delete('client')
    const qs = nextParams.toString()
    onNavigate(qs ? `/clients-sites?${qs}` : '/clients-sites')
  }

  const clientsAggregate = useMemo(() => {
    let totalSites = 0
    let totalRevenue = 0
    let totalPending = 0
    for (const c of clients) {
      totalSites += c.sites
      totalRevenue += parseCurrency(c.revenue)
      totalPending += parseCurrency(c.pending)
    }
    return {
      totalClients: clients.length,
      totalSites,
      totalRevenue,
      totalPending,
    }
  }, [clients])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const baseRows = (!q ? [...clients] : clients.filter((r) => r.name.toLowerCase().includes(q) || r.phone.includes(q))).filter((r) => {
      if (clientPendingFilter === 'withPending') return parseCurrency(r.pending) > 0
      if (clientPendingFilter === 'cleared') return parseCurrency(r.pending) === 0
      return true
    })

    if (summary === 'pending') {
      return baseRows
        .filter((r) => parseCurrency(r.pending) > 0)
        .sort((a, b) => parseCurrency(b.pending) - parseCurrency(a.pending))
    }
    if (summary === 'received') {
      return baseRows.sort((a, b) => parseCurrency(b.received) - parseCurrency(a.received))
    }
    if (summary === 'total-revenue') {
      return baseRows.sort((a, b) => parseCurrency(b.revenue) - parseCurrency(a.revenue))
    }
    if (summary === 'total-sites') {
      return baseRows.sort((a, b) => b.sites - a.sites)
    }

    return baseRows
  }, [clientPendingFilter, query, summary, clients])

  const clientPageCount = Math.max(1, Math.ceil(filteredRows.length / CLIENT_PAGE_SIZE))
  const safeClientPage = Math.min(clientPage, clientPageCount)

  const paginatedClients = useMemo(() => {
    const start = (safeClientPage - 1) * CLIENT_PAGE_SIZE
    return filteredRows.slice(start, start + CLIENT_PAGE_SIZE)
  }, [filteredRows, safeClientPage])

  useEffect(() => {
    setClientPage(1)
  }, [query, clientPendingFilter, summary, selectedClientName])

  const userRoleLabel =
    user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : ''

  const resetAddClientForm = () => {
    setNewClientName('')
    setNewClientPhone('')
    setAddClientError('')
  }

  const handleOpenAddClientModal = () => {
    resetAddClientForm()
    setIsAddClientModalOpen(true)
  }

  const handleCloseAddClientModal = () => {
    setIsAddClientModalOpen(false)
    resetAddClientForm()
  }

  const handleOpenAddSiteModal = () => {
    setIsAddSiteModalOpen(true)
  }

  const handleCloseAddSiteModal = () => {
    setIsAddSiteModalOpen(false)
  }

  const handleCreateClient = async () => {
    const name = newClientName.trim()
    const phone = newClientPhone.trim()

    if (!name) {
      setAddClientError('Client name is required.')
      return
    }
    if (!phone) {
      setAddClientError('Phone number is required.')
      return
    }
    if (!/^\d{10}$/.test(phone)) {
      setAddClientError('Phone number must be 10 digits.')
      return
    }

    const duplicate = clients.some((client) => client.name.toLowerCase() === name.toLowerCase())
    if (duplicate) {
      setAddClientError('A client with this name already exists.')
      return
    }

    try {
      const body: { name: string; phone: string; adminId?: string } = { name, phone }
      if (user?.role === 'super_admin') {
        const adminsRes = await http.get<{ ok: boolean; admins: Array<{ id: string }> }>('/api/admins')
        const aid = adminsRes.data?.admins?.[0]?.id
        if (aid) {
          body.adminId = aid
        }
      }
      const res = await http.post<{ ok: boolean; client: ClientRow; error?: string }>('/api/clients', body)
      if (res.status !== 201 || !res.data?.ok) {
        setAddClientError(res.data?.error ?? 'Could not create client.')
        return
      }
      toast.success('Client created')
      await refreshClientsAndSites()
      setSelectedClientName(null)
      setQuery('')
      handleCloseAddClientModal()
    } catch (e) {
      const msg =
        axios.isAxiosError(e) && (e.response?.data as { error?: string })?.error
          ? String((e.response?.data as { error?: string }).error)
          : 'Could not create client.'
      setAddClientError(msg)
    }
  }

  const getSiteDetailsPath = (clientName: string, site: SiteRow) => {
    const params = new URLSearchParams({
      client: clientName,
      name: site.name,
      location: site.location,
      lastVisit: site.lastVisit,
      status: site.status,
      received: site.received,
      pending: site.pending,
    })
    if (site.id) params.set('siteId', site.id)
    return `/site-details?${params.toString()}`
  }

  const handleExportClientPdf = () => {
    if (!selectedClient || exportBusy) return
    setExportBusy(true)
    void runExport('client PDF', () => exportClientPdf(selectedClient, selectedSites)).finally(() =>
      setExportBusy(false),
    )
  }

  const handleExportClientExcel = () => {
    if (!selectedClient || exportBusy) return
    setExportBusy(true)
    void runExport('client spreadsheet', () => exportClientExcel(selectedClient, selectedSites)).finally(() =>
      setExportBusy(false),
    )
  }

  const handleOpenDeleteClient = () => {
    if (!selectedClient?.id) {
      toast.error('Client is not synced yet. Refresh the page.')
      return
    }
    setPendingDeleteSite(null)
    setPendingDeleteClient(selectedClient)
  }

  const openDeleteClientDialog = (row: ClientRow) => {
    if (!row.id) {
      toast.error('Client is not synced yet. Refresh the page.')
      return
    }
    setPendingDeleteSite(null)
    setPendingDeleteClient(row)
  }

  const openDeleteSiteDialog = (site: SiteRow, clientName: string) => {
    if (!site.id) {
      toast.error('Site is not synced yet. Refresh the page.')
      return
    }
    setPendingDeleteClient(null)
    setPendingDeleteSite({ id: site.id, name: site.name, clientName })
  }

  const handleConfirmDeleteClient = async () => {
    const row = pendingDeleteClient
    if (!row?.id) return
    setDeleteClientBusy(true)
    try {
      const res = await http.delete<{ ok: boolean; sitesDeleted?: number; error?: string }>(`/api/clients/${row.id}`)
      if (!res.data?.ok) {
        toast.error(res.data?.error ?? 'Could not delete client.')
        return
      }
      const n = res.data.sitesDeleted ?? 0
      toast.success(n > 0 ? `Client deleted (${n} site${n === 1 ? '' : 's'} removed).` : 'Client deleted.')
      setPendingDeleteClient(null)
      await refreshClientsAndSites()
      if (selectedClient?.id === row.id) {
        handleBackFromClientDetails()
      }
    } catch (e) {
      const msg =
        axios.isAxiosError(e) && (e.response?.data as { error?: string })?.error
          ? String((e.response?.data as { error?: string }).error)
          : 'Could not delete client.'
      toast.error(msg)
    } finally {
      setDeleteClientBusy(false)
    }
  }

  const handleConfirmDeleteSite = async () => {
    const target = pendingDeleteSite
    if (!target) return
    setDeleteSiteBusy(true)
    try {
      const res = await http.delete<{ ok: boolean; error?: string }>(`/api/sites/${target.id}`)
      if (!res.data?.ok) {
        toast.error(res.data?.error ?? 'Could not delete site.')
        return
      }
      toast.success(`Site "${target.name}" deleted.`)
      setPendingDeleteSite(null)
      await refreshClientsAndSites()
    } catch (e) {
      const msg =
        axios.isAxiosError(e) && (e.response?.data as { error?: string })?.error
          ? String((e.response?.data as { error?: string }).error)
          : 'Could not delete site.'
      toast.error(msg)
    } finally {
      setDeleteSiteBusy(false)
    }
  }

  const handleExportAllClientsPdf = () => {
    if (exportBusy) return
    setExportBusy(true)
    void runExport('clients PDF', () => exportAllClientsPdf(filteredRows)).finally(() => setExportBusy(false))
  }

  const handleExportAllClientsExcel = () => {
    if (exportBusy) return
    setExportBusy(true)
    void runExport('clients spreadsheet', () => exportAllClientsExcel(filteredRows)).finally(() =>
      setExportBusy(false),
    )
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
                <div className="mt-1 text-xs font-semibold text-white/65">
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                {user?.email ? (
                  <a
                    href={`mailto:${user.email}`}
                    className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-white/90 hover:bg-white/5"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f39b03]">
                      <Mail size={15} />
                    </span>
                    <span className="min-w-0 truncate">{user.email}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-white/50">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f39b03]">
                      <Mail size={15} />
                    </span>
                    <span className="min-w-0 truncate">—</span>
                  </div>
                )}
                {user?.phone ? (
                  <a
                    href={`tel:${user.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold text-white/90 hover:bg-white/5"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#f39b03]">
                      <Phone size={15} />
                    </span>
                    <span>{user.phone}</span>
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
                    path === '/clients-sites'
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
                {selectedClient ? (
                  <button
                    type="button"
                    onClick={handleBackFromClientDetails}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/20 bg-black px-2.5 text-[11px] font-extrabold text-white transition hover:bg-neutral-900"
                  >
                    <ArrowLeft size={14} className="text-white" />
              
                  </button>
                ) : (
                  <PageRefreshButton variant="onDark" />
                )}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <h1 className="min-w-0 flex-1 truncate text-left text-base font-extrabold leading-tight tracking-tight text-white">
                    {selectedClient ? 'Client Details' : 'Clients & Sites'}
                  </h1>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {selectedClient ? <PageRefreshButton variant="onDark" /> : null}
                  <HeaderYearSelect variant="onDark" compact />
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
                {selectedClient ? (
                  <button
                    type="button"
                    onClick={handleBackFromClientDetails}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-extrabold text-neutral-800 transition hover:bg-neutral-50"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                ) : null}
                <div className="min-w-0 truncate text-lg font-extrabold tracking-tight text-neutral-950 sm:text-xl">
                  {selectedClient ? 'Client Details' : 'Clients & Sites'}
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
                    <div className="truncate text-xs font-extrabold text-neutral-900 sm:text-sm">
                      {user?.fullName ?? '—'}
                    </div>
                    <div className="text-[11px] font-semibold text-neutral-600">{userRoleLabel || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="mobile-main-scroll-pad min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white px-4 pt-2 sm:px-6 sm:pt-3 md:px-6 md:pt-4 lg:px-8 lg:pt-4">
            {selectedClient ? (
              <section className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm ring-1 ring-black/5 md:rounded-2xl md:p-4 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)] md:ring-0">
                <div className="text-sm font-semibold text-neutral-600">
                  Client
                </div>
                <div className="mt-0.5 text-2xl font-extrabold leading-tight tracking-tight text-neutral-900 md:text-3xl">
                  {selectedClient.name}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-neutral-600 md:mt-2.5 md:gap-3 md:text-xs">
                  <span className="inline-flex items-center rounded-lg bg-neutral-100 px-2.5 py-1 text-neutral-700 ring-1 ring-neutral-200">
                    Phone: {selectedClient.phone}
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-neutral-100 px-2.5 py-1 text-neutral-700 ring-1 ring-neutral-200">
                    Total Sites: {selectedClient.sites}
                  </span>
                </div>
              </section>
            ) : null}

            {/* Top summary cards */}
            <section className="mt-3 grid grid-cols-2 gap-1.5 md:mt-4 md:grid-cols-4 md:gap-4">
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
          
                aria-label={selectedClient ? 'Open Received Amount records' : 'Open Total Clients records'}
              >
                <StatCard
                  title={selectedClient ? 'Total Received Amount' : 'Total Clients'}
                  value={selectedClient ? selectedClient.received : String(clientsAggregate.totalClients)}
                  subtitle={selectedClient ? 'Current Client' : 'All Clients'}
                  icon={<UsersRound size={20} className="text-sky-600" />}
                  toneClass="bg-sky-100"
                  mobileCardTint="bg-sky-50/90"
                />
              </button>
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
             
                aria-label="Open Total Sites records"
              >
                <StatCard
                  title="Total Sites"
                  value={selectedClient ? String(selectedClient.sites) : String(clientsAggregate.totalSites)}
                  subtitle={selectedClient ? 'Current Client' : 'All Sites'}
                  icon={<MapPin size={20} className="text-violet-600" />}
                  toneClass="bg-violet-100"
                  mobileCardTint="bg-violet-50/90"
                />
              </button>
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
             
                aria-label="Open Total Revenue records"
              >
                <StatCard
                  title="Total Revenue"
                  value={
                    selectedClient ? selectedClient.revenue : formatRupee(clientsAggregate.totalRevenue)
                  }
                  subtitle="This Financial Year"
                  icon={<IndianRupee size={20} className="text-emerald-600" />}
                  toneClass="bg-emerald-100"
                  mobileCardTint="bg-emerald-50/90"
                />
              </button>
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
               
                aria-label="Open Pending Amount records"
              >
                <StatCard
                  title="Pending Amount"
                  value={
                    selectedClient ? selectedClient.pending : formatRupee(clientsAggregate.totalPending)
                  }
                  subtitle="This Financial Year"
                  icon={<Briefcase size={20} className="text-rose-600" />}
                  toneClass="bg-rose-100"
                  mobileCardTint="bg-rose-50/90"
                />
              </button>
            </section>

            {!selectedClient ? (
              <CardPanel className="my-3 flex flex-col gap-2.5 p-2.5 md:my-4 md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
                <div className="w-full md:max-w-[740px]">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    type="text"
                    placeholder={showAllSites ? 'Search sites…' : 'Search clients…'}
                    className={toolbarSearchInputClass}
                  />
                </div>
                <div className="flex w-full flex-wrap items-center justify-between gap-2 md:w-auto md:justify-start">
                  <AppSelect
                    value={showAllSites ? siteStatusFilter : clientPendingFilter}
                    onChange={(v) => {
                      if (showAllSites) {
                        setSiteStatusFilter(v as 'all' | SiteRow['status'])
                      } else {
                        setClientPendingFilter(v as 'all' | 'withPending' | 'cleared')
                      }
                    }}
                    className={[toolbarSecondaryButtonClass, 'min-w-[9rem]'].join(' ')}
                    aria-label={showAllSites ? 'Filter sites' : 'Filter clients'}
                    options={
                      showAllSites
                        ? [
                            { value: 'all', label: 'All Statuses' },
                            { value: 'Active', label: 'Active' },
                            { value: 'On Hold', label: 'On Hold' },
                            { value: 'Completed', label: 'Completed' },
                          ]
                        : [
                            { value: 'all', label: 'All Clients' },
                            { value: 'withPending', label: 'With Pending' },
                            { value: 'cleared', label: 'Cleared' },
                          ]
                    }
                  />
                  {!showAllSites ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        className={toolbarSecondaryButtonClass}
                        disabled={exportBusy || filteredRows.length === 0}
                        onClick={handleExportAllClientsPdf}
                      >
                        {exportBusy ? 'Exporting…' : 'Export'}
                      </button>
                    
                      <button
                        type="button"
                        onClick={handleOpenAddClientModal}
                        className={toolbarPrimaryButtonClass}
                      >
                        <Plus className={toolbarPlusIconClass} />
                        Add New Client
                      </button>
                    </div>
                  ) : null}
                </div>
              </CardPanel>
            ) : (
              <CardPanel className="my-3 flex flex-col gap-3 p-3 md:my-4 md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
                <div className="w-full md:max-w-[740px]">
                  <input
                    value={sitesSearchQuery}
                    onChange={(e) => setSitesSearchQuery(e.target.value)}
                    type="text"
                    placeholder="Search sites…"
                    className={toolbarSearchInputClass}
                  />
                </div>
                <div className="flex w-full flex-wrap items-center justify-between gap-2 md:w-auto md:justify-start">
                  <AppSelect
                    value={siteStatusFilter}
                    onChange={(v) => setSiteStatusFilter(v as 'all' | SiteRow['status'])}
                    className={[toolbarSecondaryButtonClass, 'min-w-[9rem]'].join(' ')}
                    aria-label="Filter sites by status"
                    options={[
                      { value: 'all', label: 'All Statuses' },
                      { value: 'Active', label: 'Active' },
                      { value: 'On Hold', label: 'On Hold' },
                      { value: 'Completed', label: 'Completed' },
                    ]}
                  />
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      className={toolbarSecondaryButtonClass}
                      disabled={exportBusy}
                      onClick={handleExportClientPdf}
                    >
                      {exportBusy ? 'Exporting…' : 'Export'}
                    </button>
                    
                    <button type="button" onClick={handleOpenAddSiteModal} className={toolbarPrimaryButtonClass}>
                      <Plus className={toolbarPlusIconClass} />
                      Add New Site
                    </button>
                  </div>
                </div>
              </CardPanel>
            )}

            {selectedClient ? (
              /* Client detail: sites table */
              <CardShell
                title="Sites"
                className="mt-3 overflow-hidden md:mt-4"
                bodyClassName="p-0"
                headerEnd={
                  <span className="text-xs font-semibold text-neutral-600">
                    {sitesSearchQuery.trim()
                      ? `${filteredSitesForClient.length} matching • ${selectedSites.length} total for ${selectedClient.name}`
                      : `${selectedSites.length} sites for ${selectedClient.name}`}
                  </span>
                }
              >
                <div className="md:hidden">
                  <ul className="flex flex-col gap-1.5 px-3 pb-4 pt-1.5">
                    {filteredSitesForClient.map((site) => (
                      <li key={site.id ?? `${selectedClient.name}-${site.name}`}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onNavigate(getSiteDetailsPath(selectedClient.name, site))}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onNavigate(getSiteDetailsPath(selectedClient.name, site))
                            }
                          }}
                          className="w-full rounded-xl border border-neutral-200 bg-white p-2 text-left shadow-sm ring-1 ring-black/5 md:p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-extrabold text-neutral-900">{site.name}</div>
                              <div className="mt-0.5 text-[10px] font-semibold text-neutral-500">
                                {site.location} • {site.lastVisit}
                              </div>
                            </div>
                            <span
                              className={[
                                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1',
                                site.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                  : site.status === 'Completed'
                                    ? 'bg-neutral-100 text-neutral-700 ring-neutral-200'
                                    : 'bg-amber-50 text-amber-700 ring-amber-200',
                              ].join(' ')}
                            >
                              {site.status}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between md:mt-2">
                            <div className="text-xs font-extrabold text-rose-600">{site.pending}</div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20 md:h-8 md:w-8"
                                aria-label={`View ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(selectedClient.name, site))
                                }}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-900 transition hover:bg-neutral-50 md:h-8 md:w-8"
                                aria-label={`Open ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(selectedClient.name, site))
                                }}
                              >
                                <ArrowRight size={15} />
                              </button>
                              <button
                                type="button"
                                className={actionTrashButtonClassMobile}
                                aria-label={`Delete ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openDeleteSiteDialog(site, selectedClient.name)
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                    {filteredSitesForClient.length === 0 ? (
                      <li className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-xs font-semibold text-neutral-600">
                        {selectedSites.length === 0
                          ? 'No sites found for this client.'
                          : 'No sites match your search.'}
                      </li>
                    ) : null}
                  </ul>
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead className="bg-neutral-50">
                      <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                        <th className="px-6 py-4">Site Name</th>
                        <th className="px-4 py-4">Location</th>
                        <th className="px-4 py-4">Last Visit</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">Pending</th>
                        <th className="px-4 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-semibold text-neutral-800">
                      {filteredSitesForClient.map((site) => (
                        <tr
                          key={site.id ?? site.name}
                          className="border-t border-neutral-200 hover:bg-neutral-50/60"
                          onClick={() => onNavigate(getSiteDetailsPath(selectedClient.name, site))}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onNavigate(getSiteDetailsPath(selectedClient.name, site))
                            }
                          }}
                        >
                          <td className="px-6 py-4 font-extrabold text-neutral-950">{site.name}</td>
                          <td className="px-4 py-4 text-neutral-700">{site.location}</td>
                          <td className="px-4 py-4 text-neutral-700">{site.lastVisit}</td>
                          <td className="px-4 py-4">
                            <span
                              className={[
                                'inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1',
                                site.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                  : site.status === 'Completed'
                                    ? 'bg-neutral-100 text-neutral-700 ring-neutral-200'
                                    : 'bg-amber-50 text-amber-700 ring-amber-200',
                              ].join(' ')}
                            >
                              {site.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-extrabold text-rose-600">{site.pending}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20"
                                aria-label={`View ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(selectedClient.name, site))
                                }}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-900 transition hover:bg-neutral-50"
                                aria-label={`Open ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(selectedClient.name, site))
                                }}
                              >
                                <ArrowRight size={16} />
                              </button>
                              <button
                                type="button"
                                className={actionTrashButtonClass}
                                aria-label={`Delete ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openDeleteSiteDialog(site, selectedClient.name)
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredSitesForClient.length === 0 ? (
                        <tr className="border-t border-neutral-200">
                          <td className="px-6 py-8 text-sm font-semibold text-neutral-600" colSpan={6}>
                            {selectedSites.length === 0
                              ? 'No sites found for this client.'
                              : 'No sites match your search.'}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CardShell>
            ) : showAllSites ? (
              /* All sites list */
              <CardShell
                title="All Sites"
                className="mt-3 overflow-hidden md:mt-4"
                bodyClassName="p-0"
                headerEnd={
                  <span className="text-xs font-semibold text-neutral-600">
                    {filteredAllSites.length} total sites
                  </span>
                }
              >
                <div className="md:hidden">
                  <ul className="flex flex-col gap-1.5 px-3 pb-4 pt-1.5">
                    {filteredAllSites.map((site) => (
                      <li key={site.id ?? `${site.clientName}-${site.name}`}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onNavigate(getSiteDetailsPath(site.clientName, site))}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onNavigate(getSiteDetailsPath(site.clientName, site))
                            }
                          }}
                          className="w-full rounded-xl border border-neutral-200 bg-white p-2 text-left shadow-sm ring-1 ring-black/5 md:p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-extrabold text-neutral-900">{site.name}</div>
                              <div className="mt-0.5 text-[10px] font-semibold text-neutral-500">
                                {site.clientName} • {site.location} • {site.lastVisit}
                              </div>
                            </div>
                            <span
                              className={[
                                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1',
                                site.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                  : site.status === 'Completed'
                                    ? 'bg-neutral-100 text-neutral-700 ring-neutral-200'
                                    : 'bg-amber-50 text-amber-700 ring-amber-200',
                              ].join(' ')}
                            >
                              {site.status}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between md:mt-2">
                            <div className="text-xs font-extrabold text-rose-600">{site.pending}</div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20 md:h-8 md:w-8"
                                aria-label={`View ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(site.clientName, site))
                                }}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-900 transition hover:bg-neutral-50 md:h-8 md:w-8"
                                aria-label={`Open ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(site.clientName, site))
                                }}
                              >
                                <ArrowRight size={15} />
                              </button>
                              <button
                                type="button"
                                className={actionTrashButtonClassMobile}
                                aria-label={`Delete ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openDeleteSiteDialog(site, site.clientName)
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                    {filteredAllSites.length === 0 ? (
                      <li className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-center text-xs font-semibold text-neutral-600">
                        No sites found.
                      </li>
                    ) : null}
                  </ul>
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead className="bg-neutral-50">
                      <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-neutral-500">
                        <th className="px-6 py-4">Site Name</th>
                        <th className="px-4 py-4">Client</th>
                        <th className="px-4 py-4">Location</th>
                        <th className="px-4 py-4">Last Visit</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">Pending</th>
                        <th className="px-4 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-semibold text-neutral-800">
                      {filteredAllSites.map((site) => (
                        <tr
                          key={site.id ?? `${site.clientName}-${site.name}`}
                          className="border-t border-neutral-200 hover:bg-neutral-50/60"
                          onClick={() => onNavigate(getSiteDetailsPath(site.clientName, site))}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onNavigate(getSiteDetailsPath(site.clientName, site))
                            }
                          }}
                        >
                          <td className="px-6 py-4 font-extrabold text-neutral-950">{site.name}</td>
                          <td className="px-4 py-4 text-neutral-700">{site.clientName}</td>
                          <td className="px-4 py-4 text-neutral-700">{site.location}</td>
                          <td className="px-4 py-4 text-neutral-700">{site.lastVisit}</td>
                          <td className="px-4 py-4">
                            <span
                              className={[
                                'inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ring-1',
                                site.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                  : site.status === 'Completed'
                                    ? 'bg-neutral-100 text-neutral-700 ring-neutral-200'
                                    : 'bg-amber-50 text-amber-700 ring-amber-200',
                              ].join(' ')}
                            >
                              {site.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-extrabold text-rose-600">{site.pending}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20"
                                aria-label={`View ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(site.clientName, site))
                                }}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-900 transition hover:bg-neutral-50"
                                aria-label={`Open ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(site.clientName, site))
                                }}
                              >
                                <ArrowRight size={16} />
                              </button>
                              <button
                                type="button"
                                className={actionTrashButtonClass}
                                aria-label={`Delete ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openDeleteSiteDialog(site, site.clientName)
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredAllSites.length === 0 ? (
                        <tr className="border-t border-neutral-200">
                          <td className="px-6 py-8 text-sm font-semibold text-neutral-600" colSpan={7}>
                            No sites found.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </CardShell>
            ) : (
              /* Clients list table */
              <CardShell
                title="Clients"
                className="mt-3 overflow-hidden md:mt-4"
                bodyClassName="p-0"
                headerEnd={
                  <span className="text-xs font-semibold text-neutral-600">{filteredRows.length} clients</span>
                }
              >
                <div className="md:hidden">
                  <ul className="flex flex-col gap-1.5 px-3 pb-4 pt-1.5">
                    {paginatedClients.length === 0 ? (
                      <li className="px-2 py-6 text-center text-sm font-semibold text-neutral-600">No clients found.</li>
                    ) : null}
                    {paginatedClients.map((row) => (
                      <li key={row.name}>
                        <div className="flex items-stretch gap-2 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-sm ring-1 ring-black/5">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-neutral-50"
                            onClick={() => setSelectedClientName(row.name)}
                          >
                            <div
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f39b03]/15 text-[10px] font-extrabold text-[#c97702] ring-1 ring-[#f39b03]/25"
                              aria-hidden
                            >
                              {getInitials(row.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-extrabold text-neutral-900">{row.name}</div>
                              <div className="mt-0.5 text-[10px] font-semibold text-neutral-500">
                                Sites: {row.sites} • Phone: {row.phone}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-[11px] font-extrabold text-emerald-600">{row.received}</div>
                              <div className="text-[10px] font-bold text-rose-600">{row.pending}</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            className={`${actionTrashButtonClassMobile} shrink-0 self-center`}
                            aria-label={`Delete client ${row.name}`}
                            onClick={() => openDeleteClientDialog(row)}
                          >
                            <Trash2 size={14} />
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
                        <th className="px-6 py-4">Client Name</th>
                        <th className="px-4 py-4">Total Sites</th>
                        <th className="px-4 py-4">Total Revenue</th>
                        <th className="px-4 py-4">Received</th>
                        <th className="px-4 py-4">Pending</th>
                        <th className="px-4 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-semibold text-neutral-800">
                      {paginatedClients.map((row) => (
                        <tr
                          key={row.name}
                          className="border-t border-neutral-200 hover:bg-neutral-50/60"
                          onClick={() => setSelectedClientName(row.name)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setSelectedClientName(row.name)
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f39b03]/15 text-xs font-extrabold text-[#c97702] ring-1 ring-[#f39b03]/25"
                                aria-hidden
                              >
                                {getInitials(row.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-extrabold text-neutral-950">{row.name}</div>
                                <div className="mt-0.5 text-xs font-semibold text-neutral-500">
                                  Phone: {row.phone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-extrabold text-neutral-900">{row.sites}</td>
                          <td className="px-4 py-4 font-extrabold text-neutral-900">{row.revenue}</td>
                          <td className="px-4 py-4 font-extrabold text-emerald-600">{row.received}</td>
                          <td className="px-4 py-4 font-extrabold text-rose-600">{row.pending}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20"
                                aria-label={`View ${row.name}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedClientName(row.name)
                                }}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-900 transition hover:bg-neutral-50"
                                aria-label={`Open ${row.name}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedClientName(row.name)
                                }}
                              >
                                <ArrowRight size={16} />
                              </button>
                              <button
                                type="button"
                                className={actionTrashButtonClass}
                                aria-label={`Delete client ${row.name}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDeleteClientDialog(row)
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  page={safeClientPage}
                  pageSize={CLIENT_PAGE_SIZE}
                  totalItems={filteredRows.length}
                  onPageChange={setClientPage}
                />
              </CardShell>
            )}
          </div>
        </main>
      </div>

      {isAddClientModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close add client modal"
            onClick={handleCloseAddClientModal}
          />
          <div className="relative z-[71] w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-black/10 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-neutral-950">Add New Client</h2>
                <p className="mt-1 text-xs font-semibold text-neutral-600">Create a client to start tracking sites and payments.</p>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200"
                onClick={handleCloseAddClientModal}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold text-neutral-800">Client Name</span>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(event) => {
                    setNewClientName(event.target.value)
                    if (addClientError) setAddClientError('')
                  }}
                  placeholder="Enter client name"
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03] focus:bg-white focus:ring-2 focus:ring-[#f39b03]/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold text-neutral-800">Phone Number</span>
                <input
                  type="tel"
                  value={newClientPhone}
                  onChange={(event) => {
                    const sanitized = event.target.value.replace(/\D/g, '').slice(0, 10)
                    setNewClientPhone(sanitized)
                    if (addClientError) setAddClientError('')
                  }}
                  placeholder="10-digit mobile number"
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03] focus:bg-white focus:ring-2 focus:ring-[#f39b03]/20"
                />
              </label>

              {addClientError ? <p className="text-xs font-semibold text-rose-600">{addClientError}</p> : null}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseAddClientModal}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-xs font-extrabold text-neutral-800 transition hover:bg-neutral-50 md:text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateClient}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#f39b03] px-4 text-xs font-extrabold text-white transition hover:bg-[#e18e03] md:text-sm"
              >
                <Plus size={14} />
                Create Client
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmAlert
        open={pendingDeleteClient !== null}
        title="Delete this client?"
        description="This permanently removes the client, every site under them, all site visits, invoices, visit photos on file, and related account credits or debits. This cannot be undone."
        detail={
          pendingDeleteClient
            ? `${pendingDeleteClient.name} • ${pendingDeleteClient.sites} site${pendingDeleteClient.sites === 1 ? '' : 's'}`
            : undefined
        }
        confirmLabel="Delete permanently"
        cancelLabel="Cancel"
        confirmBusy={deleteClientBusy}
        variant="danger"
        rootClassName="fixed inset-0 z-[80] flex items-center justify-center p-4"
        onCancel={() => {
          if (!deleteClientBusy) setPendingDeleteClient(null)
        }}
        onConfirm={() => {
          void handleConfirmDeleteClient()
        }}
      />

      <ConfirmAlert
        open={pendingDeleteSite !== null}
        title="Delete this site?"
        description="This permanently removes the site, its visits, invoices tied to those visits, visit photos on file, and related account transactions for this site. This cannot be undone."
        detail={pendingDeleteSite ? `${pendingDeleteSite.clientName} • ${pendingDeleteSite.name}` : undefined}
        confirmLabel="Delete site"
        cancelLabel="Cancel"
        confirmBusy={deleteSiteBusy}
        variant="danger"
        rootClassName="fixed inset-0 z-[80] flex items-center justify-center p-4"
        onCancel={() => {
          if (!deleteSiteBusy) setPendingDeleteSite(null)
        }}
        onConfirm={() => {
          void handleConfirmDeleteSite()
        }}
      />

      {isAddSiteModalOpen && selectedClient ? (
        <div className="fixed inset-0 z-[72] flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close add site modal"
            onClick={handleCloseAddSiteModal}
          />
          <div className="relative z-[73] flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-black/10">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-4 sm:px-5 sm:py-5">
              <div className="min-w-0 pr-2">
                <h2 className="text-lg font-extrabold tracking-tight text-neutral-950 sm:text-xl">Add New Site</h2>
                <p className="mt-1 text-xs font-semibold text-neutral-600">
                  Create a site for {selectedClient.name}. Add visits later to generate reports and invoices from visit details.
                </p>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200"
                onClick={handleCloseAddSiteModal}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <AddSiteForm
                clientName={selectedClient.name}
                variant="modal"
                onCancel={handleCloseAddSiteModal}
                onSuccess={handleCloseAddSiteModal}
                saveSite={async (siteName, locationName) => {
                  const row = clients.find((c) => c.name === selectedClient.name)
                  if (!row?.id) {
                    toast.error('Client is not synced yet. Refresh the page.')
                    throw new Error('no client id')
                  }
                  const res = await http.post<{ ok: boolean; error?: string }>('/api/sites', {
                    clientId: row.id,
                    name: siteName,
                    locationLabel: locationName,
                  })
                  if (res.status !== 201 || !res.data?.ok) {
                    toast.error(res.data?.error ?? 'Could not save site')
                    throw new Error('save site failed')
                  }
                  toast.success('Site saved')
                  await refreshClientsAndSites()
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex w-full flex-col border-t border-white/10 bg-black [transform:translate3d(0,0,0)] md:hidden"
        aria-label="Mobile primary navigation"
      >
        <div className="mx-auto flex w-full max-w-lg items-stretch justify-between gap-0 px-1 pt-1.5 pb-1">
          {mobileBottomNav.map((item) => {
            const active = item.path === '/clients-sites'
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

      {/* Fixed Bottom Footer */}
      <LayoutFooter />
    </div>
  )
}

