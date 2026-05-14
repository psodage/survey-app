/**
 * Sets invoice-related company fields + local logo SurveyFile for one company.
 *
 * Run from server/: npm run seed-company-invoice
 *
 * Requires MONGO_URI or MONGODB_URI in backend/.env
 */
import 'dotenv/config'
import fs from 'fs'
import mongoose from 'mongoose'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { connectMongo } from '../config/db.js'
import '../models/index.js'
import Company from '../models/Company.js'
import User from '../models/User.js'
import SurveyFile from '../models/SurveyFile.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const COMPANY_ID = '6a023bc21562406930a10072'
const LOGO_PUBLIC_PATH = '/branding/logo-bg2.png'
const LOGO_FILE = 'logo-bg2.png'

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI
  if (!uri) {
    console.error('Set MONGO_URI or MONGODB_URI in backend/.env')
    process.exit(1)
  }
  await connectMongo(uri)

  const company = await Company.findById(COMPANY_ID)
  if (!company) {
    console.error('Company not found:', COMPANY_ID)
    process.exit(1)
  }

  const absLogo = join(__dirname, '../../public/branding', LOGO_FILE)
  if (!fs.existsSync(absLogo)) {
    console.error('Missing public file:', absLogo)
    process.exit(1)
  }
  const st = fs.statSync(absLogo)

  let uploader = await User.findOne({ companyId: company._id, role: 'super_admin' }).select('_id').lean()
  if (!uploader) {
    uploader = await User.findOne({ companyId: company._id }).sort({ createdAt: 1 }).select('_id').lean()
  }
  if (!uploader) {
    console.error('No user in company to attribute SurveyFile upload')
    process.exit(1)
  }

  if (company.branding?.logoFileId) {
    await SurveyFile.deleteOne({ _id: company.branding.logoFileId })
  }

  const fileDoc = await SurveyFile.create({
    companyId: company._id,
    uploadedByUserId: uploader._id,
    storageProvider: 'local',
    key: `branding/${LOGO_FILE}`,
    url: LOGO_PUBLIC_PATH,
    mimeType: 'image/png',
    sizeBytes: st.size,
    linked: { entityType: 'company_branding', entityId: company._id },
  })

  company.email = 'samarthlandsurveyors@gmail.com'
  company.officeAddress = 'Bhoinagar Shahapur, Ichalkaranji'
  company.gstNumber = ''
  company.branding = company.branding || {}
  company.branding.logoFileId = fileDoc._id
  if (!company.name?.trim()) {
    company.name = 'Samarth Land Surveyors'
  }
  await company.save()

  console.info('Updated company invoice branding:', COMPANY_ID, company.name)
  await mongoose.connection.close()
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
