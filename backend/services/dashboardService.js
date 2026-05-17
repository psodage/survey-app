import Client from '../models/Client.js'
import Site from '../models/Site.js'
import SiteVisit from '../models/SiteVisit.js'
import { resolveInstrumentScope, instrumentScopeMatch, peerAwareAdminScopeMatch } from '../utils/scope.js'
import { visitDateRangeForYear } from '../utils/yearQuery.js'
import { decAmount } from '../utils/visitPaymentMath.js'

function formatInr(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function paymentLabel(s) {
  const m = { pending: 'Pending', partial: 'Partial', paid: 'Paid', waived: 'Waived' }
  return m[s] ?? s
}

/** MongoDB expression matching effectivePaidAmount() in visitPaymentMath.js */
function receivedAmountExpr() {
  return {
    $let: {
      vars: {
        amt: { $toDouble: { $ifNull: ['$amount', 0] } },
        paidSet: { $ne: [{ $ifNull: ['$paidAmount', null] }, null] },
      },
      in: {
        $cond: [
          '$$paidSet',
          { $min: ['$$amt', { $toDouble: { $ifNull: ['$paidAmount', 0] } }] },
          {
            $switch: {
              branches: [
                { case: { $eq: ['$paymentStatus', 'paid'] }, then: '$$amt' },
                { case: { $eq: ['$paymentStatus', 'partial'] }, then: { $multiply: ['$$amt', 0.5] } },
              ],
              default: 0,
            },
          },
        ],
      },
    },
  }
}

function visitAmountFieldsStage() {
  return {
    $addFields: {
      amountNum: { $toDouble: { $ifNull: ['$amount', 0] } },
      receivedNum: receivedAmountExpr(),
    },
  }
}

export async function getDashboard(req) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const visitYearRange = visitDateRangeForYear(req.query?.year)
  const base = {
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...(await peerAwareAdminScopeMatch(req)),
  }

  const visitMatch = { ...base, ...(visitYearRange ? { visitDate: visitYearRange } : {}) }

  const [visits, facetRows, totalClients, totalSites] = await Promise.all([
    SiteVisit.find(visitMatch)
      .sort({ visitDate: -1 })
      .limit(10)
      .populate('clientId', 'name')
      .populate('siteId', 'name')
      .lean(),
    SiteVisit.aggregate([
      { $match: visitMatch },
      visitAmountFieldsStage(),
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$amountNum' },
                received: { $sum: '$receivedNum' },
              },
            },
          ],
          byClient: [
            { $match: { clientId: { $ne: null } } },
            {
              $group: {
                _id: '$clientId',
                revenue: { $sum: '$amountNum' },
                received: { $sum: '$receivedNum' },
              },
            },
            {
              $addFields: {
                pending: { $subtract: ['$revenue', '$received'] },
              },
            },
            { $match: { pending: { $gt: 0 } } },
            { $sort: { pending: -1 } },
            { $limit: 50 },
          ],
        },
      },
    ]),
    Client.countDocuments(base),
    Site.countDocuments(base),
  ])

  const recentVisits = visits.map((v) => ({
    id: v.visitCode || v._id.toString(),
    visitMongoId: v._id.toString(),
    site: v.siteId?.name ?? '',
    client: v.clientId?.name ?? '',
    date: new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    amount: decToDisplay(decAmount(v.amount)),
    machine: v.machineLabel ?? '—',
    paymentMode: v.paymentMode ?? '—',
    paymentStatus: paymentLabel(v.paymentStatus),
    notes: v.notes ?? '',
    work: v.workDescription ?? '',
  }))

  const facet = facetRows[0] ?? { totals: [], byClient: [] }
  const totals = facet.totals[0] ?? { totalRevenue: 0, received: 0 }
  const totalRevenue = totals.totalRevenue ?? 0
  const received = totals.received ?? 0
  const pending = Math.max(0, totalRevenue - received)

  const byClient = facet.byClient ?? []
  const topPendingIds = byClient.map((row) => row._id)
  const clients =
    topPendingIds.length > 0
      ? await Client.find({ ...base, _id: { $in: topPendingIds } })
          .select('name')
          .lean()
      : []
  const nameById = new Map(clients.map((c) => [c._id.toString(), c.name]))
  const pendingAmountByClient = byClient
    .map((row) => {
      const id = row._id?.toString()
      const name = id ? nameById.get(id) : undefined
      if (!name) return null
      return [name, formatInr(row.pending)]
    })
    .filter(Boolean)

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
