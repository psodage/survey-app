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
 * Admins who have an AccountManager row for this instrument (same company), else assignment-based list.
 * Uses `AccountManager.instrumentId` when those rows exist.
 */
export async function listCoworkersOnInstrument(req) {
  const raw =
    (typeof req.query?.instrumentId === 'string' && req.query.instrumentId.trim()) ||
    (typeof req.get === 'function' && req.get('x-instrument-id')) ||
    ''
  if (!raw) return []

  const instrumentId = parseObjectId(raw, 'instrument id')
  const inst = await Instrument.findOne({ _id: instrumentId, companyId: req.user.companyId }).select('_id').lean()
  if (!inst) throw new ApiError(404, 'Instrument not found')

  if (req.user.role !== 'super_admin') {
    const allowed = await getAllowedInstrumentObjectIds({
      id: req.user.id,
      companyId: req.user.companyId,
      role: req.user.role,
    })
    const canSee = allowed.some((id) => id != null && id.equals(instrumentId))
    if (!canSee) throw new ApiError(403, 'Not assigned to this instrument')
  }

  const assignments = await InstrumentAssignment.find({
    companyId: req.user.companyId,
    instrumentId,
    isActive: true,
    revokedAt: { $exists: false },
  })
    .select('adminId')
    .lean()

  const amByInstrument = await AccountManager.find({
    companyId: req.user.companyId,
    instrumentId,
    isActive: true,
  })
    .select('adminId slug fullName phone shortName')
    .sort({ fullName: 1 })
    .lean()

  if (amByInstrument.length > 0) {
    const adminIds = [...new Set(amByInstrument.map((r) => r.adminId.toString()))].map((id) => new mongoose.Types.ObjectId(id))
    const users = await User.find({
      _id: { $in: adminIds },
      companyId: req.user.companyId,
      role: 'admin',
      isActive: true,
    })
      .select('profile email')
      .lean()
    const profileById = new Map(users.map((u) => [u._id.toString(), u]))
    /** One entry per AccountManager document so every slug on this instrument appears (multiple admins). */
    return amByInstrument.map((r) => {
      const u = profileById.get(r.adminId.toString())
      const fullName = (r.fullName && r.fullName.trim()) || u?.profile?.fullName || ''
      const shortName = (r.shortName && r.shortName.trim()) || fullName || '—'
      return {
        adminId: r.adminId.toString(),
        accountManagerSlug: r.slug,
        fullName,
        shortName,
        phone: (r.phone && r.phone.trim()) || u?.profile?.phone || '',
        email: u?.email ?? '',
      }
    })
  }

  const adminIdStrings = [...new Set(assignments.map((a) => a.adminId.toString()))]
  if (!adminIdStrings.length) return []

  const adminIds = adminIdStrings.map((id) => new mongoose.Types.ObjectId(id))

  const users = await User.find({
    _id: { $in: adminIds },
    companyId: req.user.companyId,
    role: 'admin',
    isActive: true,
  })
    .select('profile email')
    .sort({ 'profile.fullName': 1 })
    .lean()

  const amRows = await AccountManager.find({
    adminId: { $in: adminIds },
    companyId: req.user.companyId,
    isActive: true,
  })
    .select('adminId slug')
    .lean()

  const slugByAdmin = new Map()
  for (const r of amRows) {
    const key = r.adminId.toString()
    if (!slugByAdmin.has(key)) slugByAdmin.set(key, r.slug)
  }

  return users.map((u) => ({
    adminId: u._id.toString(),
    accountManagerSlug: slugByAdmin.get(u._id.toString()) ?? null,
    fullName: u.profile?.fullName ?? '',
    shortName: (u.profile?.fullName && u.profile.fullName.trim()) || '—',
    phone: u.profile?.phone ?? '',
    email: u.email ?? '',
  }))
}
