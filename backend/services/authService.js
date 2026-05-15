import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Company from '../models/Company.js'
import Instrument from '../models/Instrument.js'
import InstrumentAssignment from '../models/InstrumentAssignment.js'
import { ApiError } from '../utils/ApiError.js'
import mongoose from 'mongoose'
import { signAccessToken } from '../utils/token.js'
import { getAllowedInstrumentObjectIds } from '../utils/instrumentAccess.js'
import { isBrevoConfigured, sendPasswordResetOtpEmail } from './mailService.js'

const OTP_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const FORGOT_PASSWORD_MESSAGE =
  'If an account is registered for this email, you will receive a password reset code shortly.'

function forgotPasswordResponse(extra = {}) {
  return { ok: true, message: FORGOT_PASSWORD_MESSAGE, sent: false, ...extra }
}

function generateSixDigitOtp() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
}

function otpMatches(stored, given) {
  const a = String(stored ?? '')
  const b = String(given ?? '').trim()
  if (a.length !== 6 || b.length !== 6) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
  } catch {
    return false
  }
}

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

export async function forgotPassword({ email }) {
  const normalized = email.trim().toLowerCase()
  const matches = await User.find({ email: normalized, isActive: true })
  if (matches.length === 0) {
    return forgotPasswordResponse()
  }
  if (matches.length > 1) {
    throw new ApiError(400, 'Multiple accounts share this email. Contact support.')
  }
  const user = matches[0]
  if (user.resetOtpSentAt && Date.now() - new Date(user.resetOtpSentAt).getTime() < RESEND_COOLDOWN_MS) {
    return forgotPasswordResponse({
      sent: true,
      message: 'A code was already sent. Check your inbox, or wait a minute before requesting another.',
    })
  }
  if (!isBrevoConfigured()) {
    console.error('[forgot-password] Brevo mail env is not configured (BREVO_API_KEY or BREVO_SMTP_*).')
    throw new ApiError(
      503,
      'Password reset email is not available right now. Please contact your administrator.',
    )
  }
  const otp = generateSixDigitOtp()
  try {
    await sendPasswordResetOtpEmail({ to: normalized, otp })
  } catch (err) {
    console.error('[forgot-password] Failed to send email:', err)
    throw new ApiError(503, 'Could not send the reset code. Please try again in a moment.')
  }
  user.resetOtp = otp
  user.resetOtpExpiry = new Date(Date.now() + OTP_TTL_MS)
  user.resetOtpVerified = false
  user.resetOtpSentAt = new Date()
  await user.save()
  return forgotPasswordResponse({
    sent: true,
    message: 'We sent a 6-digit code to your email. It expires in 10 minutes.',
  })
}

export async function verifyResetOtp({ email, otp }) {
  const normalized = email.trim().toLowerCase()
  const matches = await User.find({ email: normalized }).select('+resetOtp')
  if (matches.length > 1) {
    throw new ApiError(400, 'Multiple accounts share this email. Contact support.')
  }
  if (matches.length === 0) {
    throw new ApiError(400, 'Invalid or expired code.')
  }
  const user = matches[0]
  if (!user.isActive) {
    throw new ApiError(400, 'Invalid or expired code.')
  }
  if (!user.resetOtp || !user.resetOtpExpiry) {
    throw new ApiError(400, 'Invalid or expired code.')
  }
  if (Date.now() > user.resetOtpExpiry.getTime()) {
    throw new ApiError(400, 'Invalid or expired code.')
  }
  if (!otpMatches(user.resetOtp, otp)) {
    throw new ApiError(400, 'Invalid or expired code.')
  }
  await User.updateOne({ _id: user._id }, { $set: { resetOtpVerified: true }, $unset: { resetOtp: '' } })
  return { ok: true, message: 'Code verified. You can set a new password.' }
}

export async function resetPasswordWithOtp({ email, newPassword, confirmPassword }) {
  if (newPassword !== confirmPassword) {
    throw new ApiError(400, 'Passwords do not match')
  }
  const normalized = email.trim().toLowerCase()
  const matches = await User.find({ email: normalized }).select('+passwordHash')
  if (matches.length > 1) {
    throw new ApiError(400, 'Multiple accounts share this email. Contact support.')
  }
  if (matches.length === 0) {
    throw new ApiError(400, 'Reset session is invalid or has expired. Request a new code.')
  }
  const user = matches[0]
  if (!user.isActive) {
    throw new ApiError(400, 'Reset session is invalid or has expired. Request a new code.')
  }
  if (!user.resetOtpVerified) {
    throw new ApiError(400, 'Please verify your email with the OTP first.')
  }
  if (!user.resetOtpExpiry || Date.now() > user.resetOtpExpiry.getTime()) {
    throw new ApiError(400, 'Reset session has expired. Request a new code.')
  }
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await User.updateOne(
    { _id: user._id },
    {
      $set: { passwordHash, resetOtpVerified: false },
      $unset: { resetOtp: '', resetOtpExpiry: '', resetOtpSentAt: '' },
    },
  )
  return { ok: true, message: 'Password updated. You can sign in with your new password.' }
}
