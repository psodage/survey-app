import mongoose from 'mongoose'
import Instrument from '../models/Instrument.js'
import InstrumentAssignment from '../models/InstrumentAssignment.js'
import AccountManager from '../models/AccountManager.js'
import { ApiError } from '../utils/ApiError.js'

/** Drop null/invalid ids so scope checks never throw (e.g. .equals on null → 500). */
function normalizeInstrumentObjectId(val) {
  if (val == null) return null
  if (val instanceof mongoose.Types.ObjectId) return val
  if (mongoose.isValidObjectId(val)) return new mongoose.Types.ObjectId(String(val))
  return null
}

export async function getAllowedInstrumentObjectIds(user) {
  if (user.role === 'super_admin') {
    const list = await Instrument.find({ companyId: user.companyId }).select('_id').lean()
    return list.map((d) => normalizeInstrumentObjectId(d._id)).filter(Boolean)
  }
  const [assignments, amRows] = await Promise.all([
    InstrumentAssignment.find({
      companyId: user.companyId,
      adminId: user.id,
      isActive: true,
      revokedAt: { $exists: false },
    })
      .select('instrumentId')
      .lean(),
    AccountManager.find({
      companyId: user.companyId,
      adminId: user.id,
      isActive: true,
      instrumentId: { $exists: true, $ne: null },
    })
      .select('instrumentId')
      .lean(),
  ])
  const seen = new Set()
  const out = []
  for (const r of [...assignments, ...amRows]) {
    const id = normalizeInstrumentObjectId(r.instrumentId)
    if (!id) continue
    const key = id.toString()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(id)
  }
  return out
}

export function parseObjectId(id, label = 'id') {
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${label}`)
  }
  return new mongoose.Types.ObjectId(id)
}
