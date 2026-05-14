import mongoose from 'mongoose'
import AccountManager from '../models/AccountManager.js'
import InstrumentAssignment from '../models/InstrumentAssignment.js'
import { getAllowedInstrumentObjectIds } from './instrumentAccess.js'

function readRequestedInstrumentId(req) {
  const h = req.headers['x-instrument-id']
  if (h && String(h).trim()) return String(h).trim()
  if (req.query?.instrumentId) return String(req.query.instrumentId)
  return null
}

/** Distinct adminIds that have an active AccountManager row for this instrument (preferred). */
async function adminIdsOnInstrumentViaAccountManagers(req, instrumentObjectId) {
  const rows = await AccountManager.find({
    companyId: req.user.companyId,
    instrumentId: instrumentObjectId,
    isActive: true,
  })
    .select('adminId')
    .lean()
  if (!rows.length) return null
  return new Set(rows.map((r) => r.adminId.toString()))
}

/**
 * Admin user ids sharing the active instrument (header or query): AccountManager rows first,
 * else InstrumentAssignment. Returns null when no instrument is selected or id is invalid.
 * For admins, the instrument must be one they are assigned to.
 */
export async function instrumentCoworkerAdminIdStrings(req) {
  const raw = readRequestedInstrumentId(req)?.trim()
  if (!raw || !mongoose.isValidObjectId(raw)) return null
  const instrumentId = new mongoose.Types.ObjectId(raw)

  if (req.user?.role === 'admin') {
    const allowed = await getAllowedInstrumentObjectIds({
      id: req.user.id,
      companyId: req.user.companyId,
      role: req.user.role,
    })
    if (!allowed.some((id) => id != null && id.equals(instrumentId))) return null
  }

  const fromAm = await adminIdsOnInstrumentViaAccountManagers(req, instrumentId)
  if (fromAm && fromAm.size > 0) return fromAm

  const ids = await InstrumentAssignment.distinct('adminId', {
    companyId: req.user.companyId,
    instrumentId,
    isActive: true,
    revokedAt: { $exists: false },
  })
  return new Set(ids.map((id) => id.toString()))
}
