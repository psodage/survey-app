import mongoose from 'mongoose'
import Instrument from '../models/Instrument.js'
import InstrumentAssignment from '../models/InstrumentAssignment.js'
import AccountManager from '../models/AccountManager.js'
import { ApiError } from '../utils/ApiError.js'

/** @param {{ id?: unknown; _id?: unknown }} user */
export function resolveAdminObjectId(user) {
  const raw = user?.id ?? user?._id
  if (raw == null) return null
  return normalizeInstrumentObjectId(raw)
}

/** Drop null/invalid ids so scope checks never throw (e.g. .equals on null → 500). */
function normalizeInstrumentObjectId(val) {
  if (val == null) return null
  if (val instanceof mongoose.Types.ObjectId) return val
  if (mongoose.isValidObjectId(val)) return new mongoose.Types.ObjectId(String(val))
  return null
}

function mergeInstrumentIds(rows, seen, out) {
  for (const r of rows) {
    const id = normalizeInstrumentObjectId(r.instrumentId ?? r._id)
    if (!id) continue
    const key = id.toString()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(id)
  }
}

export async function getAllowedInstrumentObjectIds(user) {
  if (user.role === 'super_admin') {
    const list = await Instrument.find({ companyId: user.companyId }).select('_id').lean()
    return list.map((d) => normalizeInstrumentObjectId(d._id)).filter(Boolean)
  }

  const adminId = resolveAdminObjectId(user)
  if (!adminId) return []

  const seen = new Set()
  const out = []

  const [assignments, amRows, companyInstruments] = await Promise.all([
    InstrumentAssignment.find({
      companyId: user.companyId,
      adminId,
      isActive: true,
      revokedAt: { $exists: false },
    })
      .select('instrumentId')
      .lean(),
    AccountManager.find({
      companyId: user.companyId,
      adminId,
      isActive: true,
      instrumentId: { $exists: true, $ne: null },
    })
      .select('instrumentId')
      .lean(),
    Instrument.find({ companyId: user.companyId }).select('_id').lean(),
  ])

  mergeInstrumentIds(assignments, seen, out)
  mergeInstrumentIds(amRows, seen, out)

  if (out.length > 0) return out

  // Admin with no assignment rows yet: allow any company instrument (selected via header).
  return companyInstruments.map((d) => normalizeInstrumentObjectId(d._id)).filter(Boolean)
}

export function parseObjectId(id, label = 'id') {
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${label}`)
  }
  return new mongoose.Types.ObjectId(id)
}
