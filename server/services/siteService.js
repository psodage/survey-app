import mongoose from 'mongoose'
import Site from '../models/Site.js'
import Client from '../models/Client.js'
import SiteVisit from '../models/SiteVisit.js'
import { ApiError } from '../utils/ApiError.js'
import { resolveInstrumentScope, adminIdFilter, instrumentScopeMatch } from '../utils/scope.js'

function dec(v) {
  if (v == null) return 0
  return parseFloat(v.toString()) || 0
}

function formatInr(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function statusLabel(s) {
  if (s === 'active') return 'Active'
  if (s === 'on_hold') return 'On Hold'
  return 'Completed'
}

async function sitePending(siteId) {
  const visits = await SiteVisit.find({ siteId }).select('amount paymentStatus').lean()
  let total = 0
  let received = 0
  for (const v of visits) {
    const a = dec(v.amount)
    total += a
    if (v.paymentStatus === 'paid') received += a
    if (v.paymentStatus === 'partial') received += a * 0.5
  }
  return Math.max(0, total - received)
}

export async function listSitesForClient(req, clientId) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const client = await Client.findOne({
    _id: clientId,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...adminIdFilter(req),
  }).lean()
  if (!client) throw new ApiError(404, 'Client not found')

  const sites = await Site.find({ clientId, companyId: req.user.companyId }).sort({ updatedAt: -1 }).lean()
  const out = []
  for (const s of sites) {
    const pending = await sitePending(s._id)
    const lastVisit = s.lastVisitAt
      ? new Date(s.lastVisitAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—'
    out.push({
      id: s._id.toString(),
      name: s.name,
      location: s.locationLabel || s.address || '—',
      lastVisit,
      status: statusLabel(s.status),
      pending: formatInr(pending),
    })
  }
  return out
}

export async function createSite(req, { clientId, name, locationLabel }) {
  const { effectiveInstrumentId, allowedInstrumentIds } = await resolveInstrumentScope(req)
  const client = await Client.findOne({
    _id: clientId,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...adminIdFilter(req),
  })
  if (!client) throw new ApiError(404, 'Client not found')
  const site = await Site.create({
    companyId: req.user.companyId,
    adminId: client.adminId,
    instrumentId: effectiveInstrumentId ?? client.instrumentId,
    clientId: client._id,
    name: name.trim(),
    locationLabel: locationLabel?.trim(),
    status: 'active',
  })
  const pending = 0
  return {
    id: site._id.toString(),
    name: site.name,
    location: site.locationLabel || '—',
    lastVisit: '—',
    status: 'Active',
    pending: formatInr(pending),
  }
}

export async function listAllSites(req) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const match = {
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...adminIdFilter(req),
  }
  const sites = await Site.find(match).populate('clientId', 'name').sort({ updatedAt: -1 }).lean()
  const out = []
  for (const s of sites) {
    const pending = await sitePending(s._id)
    const lastVisit = s.lastVisitAt
      ? new Date(s.lastVisitAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—'
    out.push({
      id: s._id.toString(),
      clientName: s.clientId?.name ?? '',
      name: s.name,
      location: s.locationLabel || s.address || '—',
      lastVisit,
      status: statusLabel(s.status),
      pending: formatInr(pending),
    })
  }
  return out
}
