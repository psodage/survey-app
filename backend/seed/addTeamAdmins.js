/**
 * Upserts named admin users for the first company in the DB.
 * Password for each account = phone digits only (spaces removed).
 *
 * Run: npm run add-team-admins   (from backend/)
 *
 * Requires MONGO_URI or MONGODB_URI. If the company has no instruments, one default
 * Total Station is created so admins can sign in with instrument scope.
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectMongo } from '../config/db.js'
import '../models/index.js'
import Company from '../models/Company.js'
import User from '../models/User.js'
import Instrument from '../models/Instrument.js'
import InstrumentAssignment from '../models/InstrumentAssignment.js'

const ADMINS = [
  { fullName: 'Shubham Bhoi', email: 'shubhambhoi@gmail.com', phoneDisplay: '8643 00 1010' },
  { fullName: 'Sanket Katakar', email: 'sanketkatkar@gmail.com', phoneDisplay: '7026 01 6077' },
  { fullName: 'Shubham Sodage', email: 'shubhamsodage@gmail.com', phoneDisplay: '95959755566' },
  { fullName: 'Prajwal Patil', email: 'prajwalpatil@gmail.com', phoneDisplay: '7058129002' },
  { fullName: 'Prathamesh Sodage', email: 'psodage@gmail.com', phoneDisplay: '9325025671' },
]

function digitsOnly(s) {
  return String(s).replace(/\D/g, '')
}

async function ensureInstruments(companyId) {
  let list = await Instrument.find({ companyId }).select('_id').lean()
  if (list.length > 0) return list.map((x) => x._id)

  const inst = await Instrument.create({
    companyId,
    name: 'Total Station TS-01',
    category: 'Total Station',
    serialNumber: 'AUTO-001',
    status: 'operational',
  })
  console.info('Created default instrument (company had none):', inst._id.toString())
  return [inst._id]
}

async function assignAllInstruments(companyId, adminId, instrumentIds, assignedByUserId) {
  await InstrumentAssignment.deleteMany({ adminId, companyId })
  if (!instrumentIds.length) return
  await InstrumentAssignment.insertMany(
    instrumentIds.map((instrumentId) => ({
      companyId,
      adminId,
      instrumentId,
      assignedByUserId: assignedByUserId ?? undefined,
      isActive: true,
    })),
  )
}

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI
  if (!uri) {
    console.error('Set MONGO_URI or MONGODB_URI in backend/.env')
    process.exit(1)
  }
  await connectMongo(uri)

  const company = await Company.findOne().sort({ createdAt: 1 })
  if (!company) {
    console.error('No company found. Run seed or add-temp-user first.')
    process.exit(1)
  }

  const superUser = await User.findOne({ companyId: company._id, role: 'super_admin' }).select('_id').lean()
  const assignedBy = superUser?._id ?? null

  const instrumentIds = await ensureInstruments(company._id)

  console.info('')
  console.info('Company:', company.name, `(${company._id})`)
  console.info('---')

  for (const row of ADMINS) {
    const email = row.email.trim().toLowerCase()
    const password = digitsOnly(row.phoneDisplay)
    if (password.length < 8) {
      console.error(`Skip ${email}: password (digits) must be at least 8 characters, got "${password}"`)
      continue
    }

    const phoneProfile = `+91 ${digitsOnly(row.phoneDisplay)}`

    const passwordHash = await bcrypt.hash(password, 12)
    let user = await User.findOne({ companyId: company._id, email })

    if (user) {
      if (user.role === 'super_admin') {
        console.warn(`Skip ${email}: user exists as super_admin`)
        continue
      }
      user.passwordHash = passwordHash
      user.role = 'admin'
      user.isActive = true
      user.profile = { ...user.profile, fullName: row.fullName, phone: phoneProfile }
      await user.save()
      console.info('Updated admin:', email)
    } else {
      user = await User.create({
        companyId: company._id,
        email,
        passwordHash,
        role: 'admin',
        isActive: true,
        profile: { fullName: row.fullName, phone: phoneProfile },
      })
      console.info('Created admin:', email)
    }

    await assignAllInstruments(company._id, user._id, instrumentIds, assignedBy)

    console.info(`  Login: ${email}  |  Password (phone digits): ${password}`)
  }

  console.info('---')
  console.info('Done.')
  console.info('')

  await mongoose.connection.close()
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
