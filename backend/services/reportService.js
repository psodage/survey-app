import SiteVisit from '../models/SiteVisit.js'
import { resolveInstrumentScope, instrumentScopeMatch, peerAwareAdminScopeMatch } from '../utils/scope.js'

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function paymentLabel(s) {
  const m = { pending: 'Pending', partial: 'Partial', paid: 'Paid', waived: 'Waived' }
  return m[s] ?? s
}

export async function listReportRows(req, filters) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const match = {
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await peerAwareAdminScopeMatch(req)),
  }
  if (filters.fromDate || filters.toDate) {
    match.visitDate = {}
    if (filters.fromDate) match.visitDate.$gte = new Date(filters.fromDate)
    if (filters.toDate) match.visitDate.$lte = new Date(filters.toDate)
  }
  if (filters.machineType) match.machineLabel = new RegExp(escapeRegex(filters.machineType), 'i')

  const visits = await SiteVisit.find(match).sort({ visitDate: -1 }).limit(500).populate('clientId', 'name').populate('siteId', 'name').lean()

  let rows = visits.map((v, i) => ({
    id: `RPT-${4000 + i}`,
    type: filters.reportType || 'Site-wise',
    client: v.clientId?.name ?? '',
    site: v.siteId?.name ?? '',
    date: new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    machine: v.machineLabel ?? '—',
    status: v.paymentStatus === 'paid' ? 'Completed' : 'Pending',
  }))

  if (filters.clientFilter) {
    const q = filters.clientFilter.trim().toLowerCase()
    rows = rows.filter((r) => r.client.toLowerCase().includes(q))
  }
  if (filters.siteFilter) {
    const q = filters.siteFilter.trim().toLowerCase()
    rows = rows.filter((r) => r.site.toLowerCase().includes(q))
  }
  if (filters.statusFilter && filters.statusFilter !== 'all') {
    rows = rows.filter((r) => r.status === filters.statusFilter)
  }
  if (filters.searchQuery) {
    const q = filters.searchQuery.trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        r.client.toLowerCase().includes(q) ||
        r.site.toLowerCase().includes(q) ||
        r.machine.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    )
  }
  return rows
}
