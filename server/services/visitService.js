import mongoose from 'mongoose'
import SiteVisit from '../models/SiteVisit.js'
import Site from '../models/Site.js'
import Client from '../models/Client.js'
import Counter from '../models/Counter.js'
import { ApiError } from '../utils/ApiError.js'
import { resolveInstrumentScope, adminIdFilter, instrumentScopeMatch } from '../utils/scope.js'

async function nextVisitCode(companyId) {
  const key = `visit:${companyId.toString()}`
  const c = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean()
  const n = c?.seq ?? 1
  return `SV-${4000 + n}`
}

function decToDisplay(n) {
  return `${Math.round(n).toLocaleString('en-IN')}`
}

function paymentLabel(s) {
  const m = { pending: 'Pending', partial: 'Partial', paid: 'Paid', waived: 'Waived' }
  return m[s] ?? s
}

export async function listVisits(req) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const match = {
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...adminIdFilter(req),
  }
  const visits = await SiteVisit.find(match).sort({ visitDate: -1 }).limit(200).populate('clientId', 'name').populate('siteId', 'name').lean()
  return visits.map((v) => ({
    id: v.visitCode || v._id.toString(),
    _id: v._id.toString(),
    visitMongoId: v._id.toString(),
    client: v.clientId?.name ?? '',
    site: v.siteId?.name ?? '',
    date: new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    machine: v.machineLabel ?? '—',
    work: v.workDescription ?? '',
    amount: decToDisplay(parseFloat((v.amount ?? 0).toString()) || 0),
    paymentMode: v.paymentMode ?? '—',
    paymentStatus: paymentLabel(v.paymentStatus),
    notes: v.notes ?? '',
    photoUrls: v.photoUrls ?? [],
  }))
}

export async function createVisit(req, body) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const site = await Site.findOne({
    _id: body.siteId,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...adminIdFilter(req),
  }).populate('clientId')
  if (!site) throw new ApiError(404, 'Site not found')

  const visitCode = await nextVisitCode(req.user.companyId)
  const visitDate = body.visitDate ? new Date(body.visitDate) : new Date()
  const amountNum = Number(body.amount) || 0
  const paymentStatusRaw = String(body.paymentStatus || 'pending').toLowerCase()
  const paymentMap = { pending: 'pending', partial: 'partial', paid: 'paid', waived: 'waived' }
  const paymentStatus = paymentMap[paymentStatusRaw] ?? 'pending'

  const visit = await SiteVisit.create({
    companyId: req.user.companyId,
    adminId: site.adminId,
    instrumentId: site.instrumentId,
    clientId: site.clientId._id,
    siteId: site._id,
    visitCode,
    visitDate,
    workDescription: body.workDescription?.trim(),
    machineLabel: body.machineLabel?.trim(),
    amount: mongoose.Types.Decimal128.fromString((Number(amountNum) || 0).toFixed(2)),
    paymentMode: body.paymentMode?.trim(),
    paymentStatus,
    notes: body.notes?.trim(),
    photoUrls: [],
    photoFileIds: [],
  })

  site.lastVisitAt = visitDate
  await site.save()

  return {
    id: visit.visitCode,
    _id: visit._id.toString(),
    client: site.clientId.name,
    site: site.name,
    date: new Date(visit.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    machine: visit.machineLabel ?? '',
    work: visit.workDescription ?? '',
    amount: decToDisplay(amountNum),
    paymentMode: visit.paymentMode ?? '',
    paymentStatus: paymentLabel(visit.paymentStatus),
    notes: visit.notes ?? '',
    photoUrls: [],
  }
}

export async function getVisitById(req, visitId) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const visit = await SiteVisit.findOne({
    _id: visitId,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...adminIdFilter(req),
  })
    .populate('clientId', 'name')
    .populate('siteId', 'name')
    .lean()
  if (!visit) throw new ApiError(404, 'Visit not found')
  return {
    id: visit.visitCode || visit._id.toString(),
    _id: visit._id.toString(),
    client: visit.clientId?.name,
    site: visit.siteId?.name,
    date: new Date(visit.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    machine: visit.machineLabel,
    work: visit.workDescription,
    amount: decToDisplay(parseFloat((visit.amount ?? 0).toString()) || 0),
    paymentMode: visit.paymentMode,
    paymentStatus: paymentLabel(visit.paymentStatus),
    notes: visit.notes,
    photoUrls: visit.photoUrls ?? [],
  }
}

export async function appendVisitPhotos(req, visitId, { urls, fileIds }) {
  const { allowedInstrumentIds } = await resolveInstrumentScope(req)
  const visit = await SiteVisit.findOne({
    _id: visitId,
    companyId: req.user.companyId,
    ...instrumentScopeMatch(allowedInstrumentIds),
    ...adminIdFilter(req),
  })
  if (!visit) throw new ApiError(404, 'Visit not found')
  if (urls?.length) {
    visit.photoUrls = [...(visit.photoUrls ?? []), ...urls]
  }
  if (fileIds?.length) {
    visit.photoFileIds = [...(visit.photoFileIds ?? []), ...fileIds.map((id) => new mongoose.Types.ObjectId(id))]
  }
  await visit.save()
  return { photoUrls: visit.photoUrls, photoFileIds: visit.photoFileIds.map((x) => x.toString()) }
}
