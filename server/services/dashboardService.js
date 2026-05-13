import Client from '../models/Client.js'
import Site from '../models/Site.js'
import SiteVisit from '../models/SiteVisit.js'
import { resolveInstrumentScope, adminIdFilter, instrumentScopeMatch } from '../utils/scope.js'

function dec(v) {
  if (v == null) return 0
  return parseFloat(v.toString()) || 0
}

function formatInr(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function paymentLabel(s) {
  const m = { pending: 'Pending', partial: 'Partial', paid: 'Paid', waived: 'Waived' }
  return m[s] ?? s
}

export async function getDashboard(req) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const base = {
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...adminIdFilter(req),
  }

  const visitMatch = { ...base }
  const visits = await SiteVisit.find(visitMatch).sort({ visitDate: -1 }).limit(10).populate('clientId', 'name').populate('siteId', 'name').lean()

  const recentVisits = visits.map((v) => ({
    id: v.visitCode || v._id.toString(),
    visitMongoId: v._id.toString(),
    site: v.siteId?.name ?? '',
    client: v.clientId?.name ?? '',
    date: new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    amount: decToDisplay(dec(v.amount)),
    machine: v.machineLabel ?? '—',
    paymentMode: v.paymentMode ?? '—',
    paymentStatus: paymentLabel(v.paymentStatus),
    notes: v.notes ?? '',
    work: v.workDescription ?? '',
  }))

  const allVisits = await SiteVisit.find(visitMatch).select('amount paymentStatus clientId').lean()
  const byClient = new Map()
  for (const v of allVisits) {
    const id = v.clientId?.toString()
    if (!id) continue
    const a = dec(v.amount)
    if (!byClient.has(id)) byClient.set(id, { revenue: 0, received: 0 })
    const row = byClient.get(id)
    row.revenue += a
    if (v.paymentStatus === 'paid') row.received += a
    if (v.paymentStatus === 'partial') row.received += a * 0.5
  }

  const clients = await Client.find({ ...base }).select('name').lean()
  const pendingAmountByClient = []
  for (const c of clients) {
    const agg = byClient.get(c._id.toString()) ?? { revenue: 0, received: 0 }
    const pending = Math.max(0, agg.revenue - agg.received)
    if (pending > 0) pendingAmountByClient.push([c.name, formatInr(pending)])
  }
  pendingAmountByClient.sort((a, b) => parseFloat(b[1].replace(/[^\d]/g, '')) - parseFloat(a[1].replace(/[^\d]/g, '')))

  let totalRevenue = 0
  let received = 0
  for (const v of allVisits) {
    const a = dec(v.amount)
    totalRevenue += a
    if (v.paymentStatus === 'paid') received += a
    if (v.paymentStatus === 'partial') received += a * 0.5
  }
  const pending = Math.max(0, totalRevenue - received)

  const totalClients = await Client.countDocuments(base)
  const totalSites = await Site.countDocuments(base)

  return {
    stats: {
      totalRevenue: formatInr(totalRevenue),
      received: formatInr(received),
      pending: formatInr(pending),
      totalSites,
      totalClients,
    },
    recentVisits,
    pendingAmountByClient: pendingAmountByClient.slice(0, 8),
  }
}

function decToDisplay(n) {
  return `${Math.round(n).toLocaleString('en-IN')}`
}
