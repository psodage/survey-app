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

/** Distinct adminIds on an instrument from active AccountManager rows (when instrumentId is set). */
async function adminIdsOnInstrumentViaAccountManagers(req, instrumentObjectId) {
  const rows = await AccountManager.find({
    companyId: req.user.companyId,
    instrumentId: instrumentObjectId,
    isActive: true,
  })
    .select('adminId')
    .lean()
  return new Set(rows.map((r) => r.adminId.toString()))
}

async function adminIdsOnInstrumentViaAssignments(req, instrumentObjectId) {
  const ids = await InstrumentAssignment.distinct('adminId', {
    companyId: req.user.companyId,
    instrumentId: instrumentObjectId,
    isActive: true,
    revokedAt: { $exists: false },
  })
  return new Set(ids.map((id) => id.toString()))
}

/**
 * Admin user ids sharing the active instrument (header or query): union of InstrumentAssignment
 * and AccountManager.instrumentId peers. Returns null when no instrument is selected or id is invalid.
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

  const [fromAm, fromAssignments] = await Promise.all([
    adminIdsOnInstrumentViaAccountManagers(req, instrumentId),
    adminIdsOnInstrumentViaAssignments(req, instrumentId),
  ])
  const merged = new Set([...fromAm, ...fromAssignments])
  return merged.size > 0 ? merged : null
}
