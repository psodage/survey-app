/**
 * Adds (or updates) ONE temporary super-admin for local login — does NOT wipe the database.
 *
 * Run from backend folder:  npm run add-temp-user
 *
 * Default credentials (override with env TEMP_USER_EMAIL / TEMP_USER_PASSWORD):
 *   Email:    temp@samarth.local
 *   Password: TempLogin@123
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectMongo } from '../config/db.js'
import '../models/index.js'
import Company from '../models/Company.js'
import User from '../models/User.js'

const email = (process.env.TEMP_USER_EMAIL || 'temp@samarth.local').trim().toLowerCase()
const password = process.env.TEMP_USER_PASSWORD || 'TempLogin@123'

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI
  if (!uri) {
    console.error('Set MONGO_URI or MONGODB_URI in backend/.env')
    process.exit(1)
  }
  await connectMongo(uri)

  let company = await Company.findOne().sort({ createdAt: 1 })
  if (!company) {
    company = await Company.create({
      name: 'Samarth Land Surveyors',
      ownerName: 'Temp Setup',
      settings: { currency: 'INR', dateFormat: 'DD/MM/YYYY' },
    })
    console.info('Created company:', company._id.toString())
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const existing = await User.findOne({ companyId: company._id, email })
  if (existing) {
    existing.passwordHash = passwordHash
    existing.role = 'super_admin'
    existing.isActive = true
    existing.profile = { ...existing.profile, fullName: 'Temporary User' }
    await existing.save()
    console.info('Updated existing user:', email)
  } else {
    await User.create({
      companyId: company._id,
      email,
      passwordHash,
      role: 'super_admin',
      isActive: true,
      profile: { fullName: 'Temporary User', phone: '' },
    })
    console.info('Created user:', email)
  }

  console.info('')
  console.info('--- Temporary login (remove this user in production) ---')
  console.info('  Email:   ', email)
  console.info('  Password:', password)
  console.info('---------------------------------------------------------')
  console.info('')

  await mongoose.connection.close()
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
