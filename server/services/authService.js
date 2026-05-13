import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Company from '../models/Company.js'
import Instrument from '../models/Instrument.js'
import InstrumentAssignment from '../models/InstrumentAssignment.js'
import { ApiError } from '../utils/ApiError.js'
import mongoose from 'mongoose'
import { signAccessToken } from '../utils/token.js'
import { getAllowedInstrumentObjectIds } from '../utils/instrumentAccess.js'

function serializeUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    fullName: user.profile?.fullName ?? '',
    phone: user.profile?.phone ?? '',
    preferences: user.preferences ?? {},
  }
}

async function listActiveAdminContacts(companyId) {
  const admins = await User.find({
    companyId,
    role: 'admin',
    isActive: true,
  })
    .select('profile')
    .sort({ 'profile.fullName': 1 })
    .lean()
  return admins.map((a) => ({
    id: a._id.toString(),
    fullName: a.profile?.fullName ?? '',
    phone: a.profile?.phone ?? '',
  }))
}

export async function login({ email, password }) {
  const normalized = email.trim().toLowerCase()
  const matches = await User.find({ email: normalized }).select('+passwordHash').populate('companyId')
  if (matches.length === 0) {
    throw new ApiError(401, 'Invalid email or password')
  }
  if (matches.length > 1) {
    throw new ApiError(400, 'Multiple accounts share this email. Contact support.')
  }
  const user = matches[0]
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid email or password')
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw new ApiError(401, 'Invalid email or password')

  user.lastLoginAt = new Date()
  await user.save()

  const instrumentIds = (await getAllowedInstrumentObjectIds({ id: user._id, companyId: user.companyId, role: user.role })).map(
    (id) => id.toString(),
  )

  const instruments = await Instrument.find({
    _id: { $in: instrumentIds },
    companyId: user.companyId,
  })
    .select('name category status')
    .lean()

  const token = signAccessToken({
    sub: user._id.toString(),
    companyId: user.companyId.toString(),
    role: user.role,
  })

  const company = user.companyId && typeof user.companyId === 'object' ? user.companyId : await Company.findById(user.companyId).lean()

  const companyObjectId = user.companyId?._id ?? user.companyId
  const companyAdmins = await listActiveAdminContacts(companyObjectId)

  return {
    token,
    user: serializeUser(user),
    instruments: instruments.map((i) => ({
      id: i._id.toString(),
      name: i.name,
      category: i.category,
      status: i.status,
    })),
    activeInstrumentId: instrumentIds[0] ?? null,
    companyAdmins,
    company: company
      ? {
          id: company._id.toString(),
          name: company.name,
          email: company.email ?? '',
          settings: company.settings,
        }
      : null,
  }
}

export async function getMe(userId) {
  const user = await User.findById(userId).lean()
  if (!user) throw new ApiError(404, 'User not found')
  const instrumentIds = (
    await getAllowedInstrumentObjectIds({ id: user._id, companyId: user.companyId, role: user.role })
  ).map((id) => id.toString())
  const instruments = await Instrument.find({ _id: { $in: instrumentIds }, companyId: user.companyId })
    .select('name category status')
    .lean()
  const company = await Company.findById(user.companyId).lean()
  const companyAdmins = await listActiveAdminContacts(user.companyId)
  return {
    user: serializeUser(user),
    instruments: instruments.map((i) => ({
      id: i._id.toString(),
      name: i.name,
      category: i.category,
      status: i.status,
    })),
    activeInstrumentId: instrumentIds[0] ?? null,
    companyAdmins,
    company: company
      ? {
          id: company._id.toString(),
          name: company.name,
          email: company.email ?? '',
          settings: company.settings,
        }
      : null,
  }
}

export async function listAdminsForSuper(user) {
  if (user.role !== 'super_admin') throw new ApiError(403, 'Forbidden')
  const admins = await User.find({ companyId: user.companyId, role: 'admin' })
    .select('email role isActive profile createdAt')
    .lean()
  const out = []
  for (const a of admins) {
    const assignments = await InstrumentAssignment.find({ adminId: a._id, isActive: true, revokedAt: { $exists: false } })
      .populate('instrumentId', 'name')
      .lean()
    out.push({
      id: a._id.toString(),
      email: a.email,
      isActive: a.isActive,
      fullName: a.profile?.fullName ?? '',
      phone: a.profile?.phone ?? '',
      instruments: assignments.map((x) => ({
        id: x.instrumentId?._id?.toString(),
        name: x.instrumentId?.name,
      })),
    })
  }
  return out
}

export async function createAdmin(user, { email, password, fullName, phone, instrumentIds }) {
  if (user.role !== 'super_admin') throw new ApiError(403, 'Forbidden')
  const exists = await User.findOne({ companyId: user.companyId, email: email.trim().toLowerCase() })
  if (exists) throw new ApiError(409, 'Email already in use')
  const passwordHash = await bcrypt.hash(password, 12)
  const admin = await User.create({
    companyId: user.companyId,
    email: email.trim().toLowerCase(),
    passwordHash,
    role: 'admin',
    profile: { fullName: fullName?.trim(), phone: phone?.trim() },
  })
  if (Array.isArray(instrumentIds) && instrumentIds.length) {
    const docs = instrumentIds
      .filter((id) => mongoose.isValidObjectId(id))
      .map((instrumentId) => ({
        companyId: user.companyId,
        adminId: admin._id,
        instrumentId: new mongoose.Types.ObjectId(instrumentId),
        assignedByUserId: user.id,
        isActive: true,
      }))
    if (docs.length) await InstrumentAssignment.insertMany(docs)
  }
  return { id: admin._id.toString(), email: admin.email }
}

export async function setAdminActive(user, adminId, isActive) {
  if (user.role !== 'super_admin') throw new ApiError(403, 'Forbidden')
  const admin = await User.findOne({ _id: adminId, companyId: user.companyId, role: 'admin' })
  if (!admin) throw new ApiError(404, 'Admin not found')
  admin.isActive = isActive
  await admin.save()
  return { ok: true }
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash')
  if (!user) throw new ApiError(404, 'User not found')
  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) throw new ApiError(401, 'Current password is incorrect')
  user.passwordHash = await bcrypt.hash(newPassword, 12)
  await user.save()
  return { ok: true }
}

export async function assignInstruments(user, adminId, instrumentIds) {
  if (user.role !== 'super_admin') throw new ApiError(403, 'Forbidden')
  const admin = await User.findOne({ _id: adminId, companyId: user.companyId, role: 'admin' })
  if (!admin) throw new ApiError(404, 'Admin not found')
  await InstrumentAssignment.deleteMany({ adminId, companyId: user.companyId })
  if (instrumentIds?.length) {
    await InstrumentAssignment.insertMany(
      instrumentIds.map((instrumentId) => ({
        companyId: user.companyId,
        adminId: admin._id,
        instrumentId,
        assignedByUserId: user.id,
        isActive: true,
      })),
    )
  }
  return { ok: true }
}
