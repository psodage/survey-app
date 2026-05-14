import mongoose from 'mongoose'
import { ApiError } from './ApiError.js'
import { getAllowedInstrumentObjectIds } from './instrumentAccess.js'
import { instrumentCoworkerAdminIdStrings } from './instrumentPeers.js'

function readRequestedInstrumentId(req) {
  const h = req.headers['x-instrument-id']
  if (h && String(h).trim()) return String(h).trim()
  if (req.query?.instrumentId) return String(req.query.instrumentId)
  return null
}

/**
 * @returns {{ allowedInstrumentIds: mongoose.Types.ObjectId[], effectiveInstrumentId: mongoose.Types.ObjectId | null }}
 */
export async function resolveInstrumentScope(req) {
  const allowedInstrumentIds = await getAllowedInstrumentObjectIds(req.user)
  const requested = readRequestedInstrumentId(req)

  if (allowedInstrumentIds.length === 0) {
    return { allowedInstrumentIds, effectiveInstrumentId: null }
  }

  if (requested) {
    if (!mongoose.isValidObjectId(requested)) {
      throw new ApiError(400, 'Invalid instrument id')
    }
    const rid = new mongoose.Types.ObjectId(requested)
    if (!allowedInstrumentIds.some((id) => id != null && id.equals(rid))) {
      throw new ApiError(403, 'Instrument is not available for this account')
    }
    return { allowedInstrumentIds, effectiveInstrumentId: rid }
  }

  return { allowedInstrumentIds, effectiveInstrumentId: allowedInstrumentIds[0] }
}

/**
 * Restricts queries to the current admin's rows (super_admin: no extra filter).
 * @param {object} req Express request with `req.user` from auth middleware
 */
export function adminIdFilter(req) {
  const user = req.user
  if (!user) return {}
  if (user.role === 'super_admin') return {}
  return { adminId: user.id }
}

/**
 * For admins: when a valid assigned instrument is active (header/query), include all peer
 * admins on that instrument in read queries; otherwise restrict to self. Super-admins: no filter.
 */
export async function peerAwareAdminScopeMatch(req) {
  const user = req.user
  if (!user) return {}
  if (user.role === 'super_admin') return {}
  const peers = await instrumentCoworkerAdminIdStrings(req)
  if (!peers || peers.size === 0) return { adminId: user.id }
  const selfStr = user.id.toString()
  if (!peers.has(selfStr)) return { adminId: user.id }
  const ids = [...peers].map((s) => new mongoose.Types.ObjectId(s))
  return { adminId: { $in: ids } }
}

/**
 * When non-empty, restrict to these instruments. When empty, omit instrumentId so
 * lists still work (legacy data, imports, or no assignments yet). Avoids `$in: []`
 * which matches nothing in MongoDB.
 * @param {import('mongoose').Types.ObjectId[]} allowedInstrumentIds
 */
export function instrumentScopeMatch(allowedInstrumentIds) {
  if (!allowedInstrumentIds?.length) return {}
  return { instrumentId: { $in: allowedInstrumentIds } }
}

/** Super admin can narrow to one admin's data */
export function optionalAdminIdQuery(req) {
  const raw = req.query?.adminId
  if (req.user.role !== 'super_admin' || !raw) return {}
  if (!mongoose.isValidObjectId(raw)) return {}
  return { adminId: new mongoose.Types.ObjectId(raw) }
}
