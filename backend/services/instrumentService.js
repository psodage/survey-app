import mongoose from 'mongoose'
import Instrument from '../models/Instrument.js'
import InstrumentAssignment from '../models/InstrumentAssignment.js'
import User from '../models/User.js'
import AccountManager from '../models/AccountManager.js'
import { ApiError } from '../utils/ApiError.js'
import { getAllowedInstrumentObjectIds, parseObjectId } from '../utils/instrumentAccess.js'

export async function listInstruments(req) {
  const match = { companyId: req.user.companyId }
  const rows = await Instrument.find(match).sort({ name: 1 }).lean()
  return rows.map((r) => ({
    id: r._id.toString(),
    name: r.name,
    category: r.category,
    serialNumber: r.serialNumber,
    status: r.status,
    notes: r.notes,
    currentAmc: r.currentAmc,
  }))
}

export async function createInstrument(req, body) {
  if (req.user.role !== 'super_admin') throw new ApiError(403, 'Forbidden')
  const doc = await Instrument.create({
    companyId: req.user.companyId,
    name: body.name.trim(),
    category: body.category?.trim(),
    serialNumber: body.serialNumber?.trim(),
    status: body.status || 'operational',
    notes: body.notes?.trim(),
  })
  return { id: doc._id.toString(), name: doc.name }
}

export async function updateInstrument(req, id, body) {
  if (req.user.role !== 'super_admin') throw new ApiError(403, 'Forbidden')
  const doc = await Instrument.findOne({ _id: id, companyId: req.user.companyId })
  if (!doc) throw new ApiError(404, 'Instrument not found')
  Object.assign(doc, body)
  await doc.save()
  return { ok: true }
}

export async function deleteInstrument(req, id) {
  if (req.user.role !== 'super_admin') throw new ApiError(403, 'Forbidden')
  await Instrument.deleteOne({ _id: id, companyId: req.user.companyId })
  return { ok: true }
}

/**
 * Admins on this instrument: union of InstrumentAssignment and AccountManager.instrumentId rows.
 */
export async function listCoworkersOnInstrument(req) {
  const raw =
    (typeof req.query?.instrumentId === 'string' && req.query.instrumentId.trim()) ||
    (typeof req.get === 'function' && req.get('x-instrument-id')) ||
    ''
  if (!raw) return []

  const instrumentId = parseObjectId(raw, 'instrument id')
  const inst = await Instrument.findOne({ _id: instrumentId, companyId: req.user.companyId }).select('_id').lean()
  if (!inst) return []

  if (req.user.role !== 'super_admin') {
    const allowed = await getAllowedInstrumentObjectIds({
      id: req.user.id,
      companyId: req.user.companyId,
      role: req.user.role,
    })
    const canSee = allowed.some((id) => id != null && id.equals(instrumentId))
    if (!canSee) throw new ApiError(403, 'Not assigned to this instrument')
  }

  const [assignments, amByInstrument] = await Promise.all([
    InstrumentAssignment.find({
      companyId: req.user.companyId,
      instrumentId,
      isActive: true,
      revokedAt: { $exists: false },
    })
      .select('adminId')
      .lean(),
    AccountManager.find({
      companyId: req.user.companyId,
      instrumentId,
      isActive: true,
    })
      .select('adminId slug fullName phone shortName')
      .sort({ fullName: 1 })
      .lean(),
  ])

  const adminIdStrings = [
    ...new Set([
      ...assignments.map((a) => a.adminId.toString()),
      ...amByInstrument.map((r) => r.adminId.toString()),
    ]),
  ]
  if (!adminIdStrings.length) return []

  const adminIds = adminIdStrings.map((id) => new mongoose.Types.ObjectId(id))
  const amDetailByAdmin = new Map(amByInstrument.map((r) => [r.adminId.toString(), r]))

  const [users, amRows] = await Promise.all([
    User.find({
      _id: { $in: adminIds },
      companyId: req.user.companyId,
      role: 'admin',
      isActive: true,
    })
      .select('profile email')
      .lean(),
    AccountManager.find({
      adminId: { $in: adminIds },
      companyId: req.user.companyId,
      isActive: true,
    })
      .select('adminId slug fullName phone shortName')
      .lean(),
  ])

  const profileById = new Map(users.map((u) => [u._id.toString(), u]))
  const slugByAdmin = new Map()
  for (const r of amRows) {
    const key = r.adminId.toString()
    if (!slugByAdmin.has(key)) slugByAdmin.set(key, r.slug)
    if (!amDetailByAdmin.has(key)) amDetailByAdmin.set(key, r)
  }

  const sortKey = (adminId) => {
    const am = amDetailByAdmin.get(adminId)
    const u = profileById.get(adminId)
    return (am?.fullName && am.fullName.trim()) || u?.profile?.fullName || u?.email || adminId
  }
  adminIdStrings.sort((a, b) => sortKey(a).localeCompare(sortKey(b)))

  return adminIdStrings.map((adminId) => {
    const am = amDetailByAdmin.get(adminId)
    const u = profileById.get(adminId)
    const fullName = (am?.fullName && am.fullName.trim()) || u?.profile?.fullName || ''
    const shortName = (am?.shortName && am.shortName.trim()) || fullName || '—'
    return {
      adminId,
      accountManagerSlug: slugByAdmin.get(adminId) ?? null,
      fullName,
      shortName,
      phone: (am?.phone && am.phone.trim()) || u?.profile?.phone || '',
      email: u?.email ?? '',
    }
  })
}
