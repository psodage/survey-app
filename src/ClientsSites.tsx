import {
  Bell,
  ArrowRight,
  ArrowLeft,
  Calendar,
  CircleUserRound,
  Download,
  Filter,
  LogOut,
  Menu,
  Plus,
  UsersRound,
  LayoutGrid,
  Briefcase,
  ClipboardList,
  Building2,
  Calculator,
  Eye,
  FileBarChart,
  Mail,
  MapPin,
  Phone,
  X,
  IndianRupee,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
import { CollaborationBrandMark } from './CollaborationBrandMark'
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
  { label: 'Site Visits', icon: <ClipboardList size={16} /> },
  { label: 'Invoice', icon: <Calculator size={16} /> },
  { label: 'Reports', icon: <FileBarChart size={16} /> },
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

type ClientRow = {
  name: string
  phone: string
  sites: number
  revenue: string
  received: string
  pending: string
}

const clientRows: ClientRow[] = [
  {
    name: 'Amit Developers',
    phone: '9876543210',
    sites: 6,
    revenue: '₹2,25,000',
    received: '₹1,40,000',
    pending: '₹85,000',
  },
  {
    name: 'Shree Krishna Infra',
    phone: '9090909090',
    sites: 5,
    revenue: '₹1,85,000',
    received: '₹1,20,000',
    pending: '₹65,000',
  },
  {
    name: 'Vishwakarma Properties',
    phone: '7026016077',
    sites: 4,
    revenue: '₹1,45,000',
    received: '₹90,000',
    pending: '₹55,000',
  },
  {
    name: 'Gajanan Projects',
    phone: '8080808080',
    sites: 3,
    revenue: '₹1,10,000',
    received: '₹70,000',
    pending: '₹40,000',
  },
  {
    name: 'Sai Realities',
    phone: '7778889990',
    sites: 3,
    revenue: '₹95,000',
    received: '₹59,000',
    pending: '₹36,000',
  },
  {
    name: 'Green Valley Constructions',
    phone: '8899001122',
    sites: 2,
    revenue: '₹85,000',
    received: '₹50,000',
    pending: '₹35,000',
  },
]

type SiteRow = {
  name: string
  location: string
  lastVisit: string
  status: 'Active' | 'On Hold' | 'Completed'
  pending: string
}

const clientSites: Record<string, SiteRow[]> = {
  'Amit Developers': [
    { name: 'Sai Residency', location: 'Pune', lastVisit: '20 May 2025', status: 'Active', pending: '₹25,000' },
    { name: 'Sunrise Enclave', location: 'Pimpri', lastVisit: '18 May 2025', status: 'Active', pending: '₹18,000' },
    { name: 'Green Valley Phase 2', location: 'Hinjewadi', lastVisit: '16 May 2025', status: 'On Hold', pending: '₹12,000' },
    { name: 'Riverfront Plaza', location: 'Wakad', lastVisit: '14 May 2025', status: 'Completed', pending: '₹0' },
    { name: 'Lakeview Towers', location: 'Baner', lastVisit: '12 May 2025', status: 'Active', pending: '₹10,000' },
    { name: 'Hillcrest Layout', location: 'Kothrud', lastVisit: '10 May 2025', status: 'Active', pending: '₹20,000' },
  ],
  'Shree Krishna Infra': [
    { name: 'Krishna Heights', location: 'Pune', lastVisit: '19 May 2025', status: 'Active', pending: '₹15,000' },
    { name: 'Shree Meadows', location: 'Nigdi', lastVisit: '17 May 2025', status: 'Active', pending: '₹12,500' },
    { name: 'Silverline Park', location: 'Chinchwad', lastVisit: '15 May 2025', status: 'On Hold', pending: '₹10,000' },
    { name: 'Orchid Avenue', location: 'Aundh', lastVisit: '12 May 2025', status: 'Active', pending: '₹7,500' },
    { name: 'Westend Square', location: 'Baner', lastVisit: '09 May 2025', status: 'Completed', pending: '₹0' },
  ],
  'Vishwakarma Properties': [
    { name: 'Vishwakarma Residency', location: 'Pune', lastVisit: '18 May 2025', status: 'Active', pending: '₹14,000' },
    { name: 'Maple Court', location: 'Katraj', lastVisit: '15 May 2025', status: 'Active', pending: '₹11,000' },
    { name: 'Skyline Hub', location: 'Hadapsar', lastVisit: '12 May 2025', status: 'On Hold', pending: '₹8,000' },
    { name: 'City Center Plots', location: 'Sinhagad', lastVisit: '08 May 2025', status: 'Completed', pending: '₹0' },
  ],
  'Gajanan Projects': [
    { name: 'Gajanan Greens', location: 'Pune', lastVisit: '16 May 2025', status: 'Active', pending: '₹12,000' },
    { name: 'Northgate Homes', location: 'Bhosari', lastVisit: '12 May 2025', status: 'Active', pending: '₹9,000' },
    { name: 'Palm View', location: 'Viman Nagar', lastVisit: '09 May 2025', status: 'On Hold', pending: '₹7,000' },
  ],
  'Sai Realities': [
    { name: 'Sai Orchard', location: 'Pune', lastVisit: '14 May 2025', status: 'Active', pending: '₹11,000' },
    { name: 'Golden Mile', location: 'Wagholi', lastVisit: '10 May 2025', status: 'Active', pending: '₹9,000' },
    { name: 'Eastside Plots', location: 'Kharadi', lastVisit: '07 May 2025', status: 'Completed', pending: '₹0' },
  ],
  'Green Valley Constructions': [
    { name: 'Green Valley Phase 1', location: 'Pune', lastVisit: '12 May 2025', status: 'Active', pending: '₹20,000' },
    { name: 'Creekside Villas', location: 'Mulshi', lastVisit: '08 May 2025', status: 'On Hold', pending: '₹15,000' },
  ],
}

type ClientsSitesProps = {
  onNavigate: (path: string) => void
}

export default function ClientsSites({ onNavigate }: ClientsSitesProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<ClientRow[]>(clientRows)
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null)
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [addClientError, setAddClientError] = useState('')
  const location = useLocation()

  const searchParams = new URLSearchParams(location.search)
  const summary = searchParams.get('summary') ?? ''
  const requestedClient = searchParams.get('client') ?? ''
  const showAllSites = summary === 'total-sites'
  const headerDateLabel = getHeaderDateLabel()

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

  const mobileBottomNav = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { label: 'Accounts', path: '/account-manager', icon: Briefcase },
    { label: 'Clients', path: '/clients-sites', icon: UsersRound },
    { label: 'Sites', path: '/site-visits', icon: MapPin },
    { label: 'Invoice', path: '/invoice', icon: Calculator },
    { label: 'Reports', path: '/reports', icon: FileBarChart },
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
      Invoice: '/invoice',
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
    return clientSites[selectedClientName] ?? []
  }, [selectedClientName])

  const allSites = useMemo(() => {
    return Object.entries(clientSites).flatMap(([clientName, sites]) =>
      sites.map((site) => ({
        ...site,
        clientName,
      })),
    )
  }, [])

  const filteredAllSites = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allSites
    return allSites.filter((s) => s.name.toLowerCase().includes(q) || s.clientName.toLowerCase().includes(q) || s.location.toLowerCase().includes(q))
  }, [allSites, query])

  const handleSummaryCardClick = (summary: 'total-clients' | 'total-sites' | 'total-revenue' | 'pending' | 'received') => {
    // Ensure we always open the list view (not a previously selected client detail view).
    setSelectedClientName(null)
    setQuery('')

    const search =
      summary === 'total-clients' ? '' : `?summary=${summary}`

    onNavigate(`/clients-sites${search}`)
  }

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const baseRows = !q ? [...clients] : clients.filter((r) => r.name.toLowerCase().includes(q) || r.phone.includes(q))

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
  }, [query, summary, clients])

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

  const handleCreateClient = () => {
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

    const nextClient: ClientRow = {
      name,
      phone,
      sites: 0,
      revenue: '₹0',
      received: '₹0',
      pending: '₹0',
    }

    setClients((prev) => [nextClient, ...prev])
    setSelectedClientName(null)
    setQuery('')
    handleCloseAddClientModal()
  }

  const getSiteDetailsPath = (clientName: string, site: SiteRow) => {
    const params = new URLSearchParams({
      client: clientName,
      name: site.name,
      location: site.location,
      lastVisit: site.lastVisit,
      status: site.status,
      pending: site.pending,
    })
    return `/site-details?${params.toString()}`
  }

  const getAddSitePath = () => {
    const params = new URLSearchParams({ mode: 'add' })
    if (selectedClientName) {
      params.set('client', selectedClientName)
    }
    return `/add-site?${params.toString()}`
  }

  const exportClientReport = (client: ClientRow, sites: SiteRow[]) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    doc.setFontSize(16)
    doc.setTextColor(23, 23, 23)
    doc.text(`Client Report: ${client.name}`, 14, 16)

    doc.setFontSize(10)
    doc.setTextColor(82, 82, 82)
    doc.text(`Phone: ${client.phone}`, 14, 23)
    doc.text(`Total Sites: ${client.sites}`, 14, 28)
    doc.text(`Total Revenue: ${client.revenue}`, 78, 28)
    doc.text(`Received: ${client.received}`, 14, 33)
    doc.text(`Pending: ${client.pending}`, 78, 33)
    doc.text(
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
      14,
      38,
    )

    const body =
      sites.length === 0
        ? [['—', '—', '—', 'No sites found', '—']]
        : sites.map((site) => [site.name, site.location, site.lastVisit, site.status, site.pending])

    autoTable(doc, {
      startY: 44,
      head: [['Site Name', 'Location', 'Last Visit', 'Status', 'Pending (Rs)']],
      body,
      headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        4: { halign: 'right' },
      },
    })

    const safeName = client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const safeDate = new Date().toISOString().slice(0, 10)
    doc.save(`client-report-${safeName || 'client'}-${safeDate}.pdf`)
  }

  const handleExportClientReport = () => {
    if (!selectedClient) return
    exportClientReport(selectedClient, selectedSites)
  }

  const handleExportAllClientsReport = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    doc.setFontSize(16)
    doc.setTextColor(23, 23, 23)
    doc.text('All Clients Report', 14, 16)

    doc.setFontSize(10)
    doc.setTextColor(82, 82, 82)
    doc.text(`Total Clients: ${filteredRows.length}`, 14, 23)
    doc.text(
      `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
      14,
      28,
    )

    const body =
      filteredRows.length === 0
        ? [['—', '—', '—', '—', 'No clients found']]
        : filteredRows.map((client) => [client.name, client.phone, String(client.sites), client.received, client.pending])

    autoTable(doc, {
      startY: 34,
      head: [['Client Name', 'Phone', 'Total Sites', 'Received (Rs)', 'Pending (Rs)']],
      body,
      headStyles: { fillColor: [243, 155, 3], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
    })

    const safeDate = new Date().toISOString().slice(0, 10)
    doc.save(`all-clients-report-${safeDate}.pdf`)
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
        >
          <div className="flex items-center justify-between px-6 pt-6">
            <img
              src="/samarth-logo.png"
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
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/15"
                    aria-label="Back"
                    onClick={() => {
                      setSelectedClientName(null)
                      setQuery('')
                    }}
                  >
                    <ArrowLeft size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-white ring-1 ring-white/10 transition hover:bg-white/10"
                    aria-label="Notifications"
                  >
                    <Bell size={18} strokeWidth={2} className="text-white" />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-white ring-2 ring-black" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                <h1 className="min-w-0 truncate text-left text-base font-extrabold leading-tight tracking-tight text-white">
                  Clients &amp; Sites
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
                  Clients &amp; Sites
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

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white px-4 pt-2 pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] sm:px-6 sm:pt-3 sm:pb-[calc(3.65rem+max(12px,env(safe-area-inset-bottom,0px)))] md:px-6 md:pt-4 md:pb-24 lg:px-8 lg:pt-4 lg:pb-28">
            {selectedClient ? (
              <section className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
                <div className="min-w-0">
                  
                  <div className="mt-1 text-sm font-semibold text-neutral-600 md:mt-0 md:text-base">
                    Client:{' '}
                    <span className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-900 md:text-2xl">
                      {selectedClient.name}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-neutral-600 md:mt-1.5 md:gap-3 md:text-xs">
                    <span className="inline-flex items-center rounded-lg bg-neutral-100 px-2.5 py-1 text-neutral-700 ring-1 ring-neutral-200">
                      Phone: {selectedClient.phone}
                    </span>
                    <span className="inline-flex items-center rounded-lg bg-neutral-100 px-2.5 py-1 text-neutral-700 ring-1 ring-neutral-200">
                      Total Sites: {selectedClient.sites}
                    </span>
                  </div>
                </div>
                <div className="w-full shrink-0 md:w-auto">
                  <div className="flex w-full items-center gap-2 md:w-auto md:justify-end">
                    <button
                      type="button"
                      onClick={() => onNavigate(getAddSitePath())}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#f39b03] px-3 text-xs font-extrabold text-white shadow-[0_10px_30px_rgba(16,24,40,0.12)] transition hover:bg-[#e18e03] md:h-11 md:flex-none md:px-4 md:text-sm"
                    >
                      <Plus size={14} className="md:h-4 md:w-4" />
                      Add New Site
                    </button>
                    <button
                      type="button"
                      onClick={handleExportClientReport}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-extrabold text-neutral-800 shadow-sm transition hover:bg-neutral-50 md:h-11 md:flex-none md:px-4 md:text-sm"
                    >
                      <Download size={14} className="text-neutral-700 md:h-4 md:w-4" />
                      Export Client Report
                    </button>
                  </div>
                  <div className="mt-1.5 flex justify-end md:mt-1.5">
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-extrabold text-neutral-800 shadow-sm transition hover:bg-neutral-50 md:h-11 md:px-4 md:text-sm"
                    >
                      <Filter size={14} className="text-neutral-700 md:h-4 md:w-4" />
                      Filter
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Top summary cards */}
            <section className="mt-3 grid grid-cols-2 gap-2 md:mt-4 md:grid-cols-4 md:gap-4">
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                onClick={() => handleSummaryCardClick(selectedClient ? 'received' : 'total-clients')}
                aria-label={selectedClient ? 'Open Received Amount records' : 'Open Total Clients records'}
              >
                <StatCard
                  title={selectedClient ? 'Total Received Amount' : 'Total Clients'}
                  value={selectedClient ? selectedClient.received : '32'}
                  subtitle={selectedClient ? 'Current Client' : 'All Clients'}
                  icon={<UsersRound size={20} className="text-sky-600" />}
                  toneClass="bg-sky-100"
                  mobileCardTint="bg-sky-50/90"
                />
              </button>
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                onClick={() => handleSummaryCardClick('total-sites')}
                aria-label="Open Total Sites records"
              >
                <StatCard
                  title="Total Sites"
                  value={selectedClient ? String(selectedClient.sites) : '48'}
                  subtitle={selectedClient ? 'Current Client' : 'All Sites'}
                  icon={<MapPin size={20} className="text-violet-600" />}
                  toneClass="bg-violet-100"
                  mobileCardTint="bg-violet-50/90"
                />
              </button>
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                onClick={() => handleSummaryCardClick('total-revenue')}
                aria-label="Open Total Revenue records"
              >
                <StatCard
                  title="Total Revenue"
                  value={selectedClient ? selectedClient.revenue : '₹12,75,000'}
                  subtitle="This Financial Year"
                  icon={<IndianRupee size={20} className="text-emerald-600" />}
                  toneClass="bg-emerald-100"
                  mobileCardTint="bg-emerald-50/90"
                />
              </button>
              <button
                type="button"
                className="cursor-pointer bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39b03]/70"
                onClick={() => handleSummaryCardClick('pending')}
                aria-label="Open Pending Amount records"
              >
                <StatCard
                  title="Pending Amount"
                  value={selectedClient ? selectedClient.pending : '₹4,29,500'}
                  subtitle="This Financial Year"
                  icon={<Briefcase size={20} className="text-rose-600" />}
                  toneClass="bg-rose-100"
                  mobileCardTint="bg-rose-50/90"
                />
              </button>
            </section>

            {!selectedClient ? (
              <CardPanel className="my-3 flex flex-col gap-2.5 p-2.5 md:my-4 md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
                <div className="w-full md:max-w-xs">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    type="text"
                    placeholder={showAllSites ? 'Search sites…' : 'Search clients…'}
                    className={toolbarSearchInputClass}
                  />
                </div>
                <div className="flex w-full flex-wrap items-center justify-between gap-2 md:w-auto md:justify-start">
                  <button type="button" className={toolbarSecondaryButtonClass}>
                    Filters
                  </button>
                  {!showAllSites ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        className={toolbarSecondaryButtonClass}
                        onClick={handleExportAllClientsReport}
                      >
                        Export All Clients
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
            ) : null}

            {selectedClient ? (
              /* Client detail: sites table */
              <CardShell
                title="Sites"
                className="mt-3 overflow-hidden md:mt-4"
                bodyClassName="p-0"
                headerEnd={
                  <span className="text-xs font-semibold text-neutral-600">
                    {selectedSites.length} sites for {selectedClient.name}
                  </span>
                }
              >
                <div className="md:hidden">
                  <ul className="flex flex-col gap-2 px-3 pb-1.5 pt-1.5">
                    {selectedSites.map((site) => (
                      <li key={site.name}>
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
                          className="w-full rounded-xl border border-neutral-200 bg-white p-2.5 text-left shadow-sm ring-1 ring-black/5 md:p-3"
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
                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-xs font-extrabold text-rose-600">{site.pending}</div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20"
                                aria-label={`View ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(selectedClient.name, site))
                                }}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-900 transition hover:bg-neutral-50"
                                aria-label={`Open ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(selectedClient.name, site))
                                }}
                              >
                                <ArrowRight size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                    {selectedSites.length === 0 ? (
                      <li className="rounded-xl border border-neutral-200 bg-white px-3 py-5 text-center text-xs font-semibold text-neutral-600">
                        No sites found for this client.
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
                      {selectedSites.map((site) => (
                        <tr
                          key={site.name}
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
                            </div>
                          </td>
                        </tr>
                      ))}
                      {selectedSites.length === 0 ? (
                        <tr className="border-t border-neutral-200">
                          <td className="px-6 py-8 text-sm font-semibold text-neutral-600" colSpan={6}>
                            No sites found for this client.
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
                  <ul className="flex flex-col gap-2 px-3 pb-1.5 pt-1.5">
                    {filteredAllSites.map((site) => (
                      <li key={`${site.clientName}-${site.name}`}>
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
                          className="w-full rounded-xl border border-neutral-200 bg-white p-2.5 text-left shadow-sm ring-1 ring-black/5 md:p-3"
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
                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-xs font-extrabold text-rose-600">{site.pending}</div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] transition hover:bg-[#f39b03]/20"
                                aria-label={`View ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(site.clientName, site))
                                }}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-900 transition hover:bg-neutral-50"
                                aria-label={`Open ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onNavigate(getSiteDetailsPath(site.clientName, site))
                                }}
                              >
                                <ArrowRight size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                    {filteredAllSites.length === 0 ? (
                      <li className="rounded-xl border border-neutral-200 bg-white px-3 py-5 text-center text-xs font-semibold text-neutral-600">
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
                          key={`${site.clientName}-${site.name}`}
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
                  <ul className="flex flex-col gap-2 px-3 pb-1.5 pt-1.5">
                    {filteredRows.map((row) => (
                      <li key={row.name}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2 text-left shadow-sm ring-1 ring-black/5"
                          onClick={() => setSelectedClientName(row.name)}
                        >
                          <div
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f39b03]/15 text-[11px] font-extrabold text-[#c97702] ring-1 ring-[#f39b03]/25"
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
                          <div className="text-right">
                            <div className="text-[11px] font-extrabold text-emerald-600">{row.received}</div>
                            <div className="text-[10px] font-bold text-rose-600">{row.pending}</div>
                          </div>
                        </button>
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
                      {filteredRows.map((row) => (
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
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="hidden items-center justify-between gap-3 border-t border-neutral-200 px-6 py-4 md:flex">
                  <div className="text-sm font-semibold text-neutral-600">
                    Showing 1 to 6 of 16 clients
                  </div>
                  <div className="flex items-center gap-2">
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
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-800 hover:bg-neutral-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
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
        </div>
      </footer>
    </div>
  )
}

