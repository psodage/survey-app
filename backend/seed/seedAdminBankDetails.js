/**
 * Sets bank details + local SurveyFile signatures for the two named admin ObjectIds.
 * Signature PNGs must exist under public/signatures/ (see repo after copy).
 *
 * Run from server/: npm run seed-admin-bank
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
import User from '../models/User.js'
import SurveyFile from '../models/SurveyFile.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const ADMINS = [
  {
    _id: '6a02433a4240e4b628fb1c60',
    signatureRelativeUrl: '/signatures/bank-signature-shubham.png',
    signatureFile: 'bank-signature-shubham.png',
    invoiceSlot: 1,
    bankDetails: {
      accountName: 'SHUBHAM DILIP BHOI',
      accountNumber: '144512010000444',
      ifscCode: 'UBIN0814458',
      bankName: 'UNION BANK',
      branch: 'Rajarampuri 8th Lane, Kolhapur.',
      upiPhone: '8643001010',
      invoiceSlot: 1,
    },
  },
  {
    _id: '6a02433b4240e4b628fb1c67',
    signatureRelativeUrl: '/signatures/bank-signature-sanket.png',
    signatureFile: 'bank-signature-sanket.png',
    invoiceSlot: 2,
    bankDetails: {
      accountName: 'SANKET MARUTI KATAKAR',
      accountNumber: '05862200005500',
      ifscCode: 'CNRB0010586',
      bankName: 'CANARA BANK',
      branch: 'Manakapur.',
      upiPhone: '7026016077',
      invoiceSlot: 2,
    },
  },
]

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI
  if (!uri) {
    console.error('Set MONGO_URI or MONGODB_URI in backend/.env')
    process.exit(1)
  }
  await connectMongo(uri)

  const publicRoot = join(__dirname, '../../public')

  for (const row of ADMINS) {
    const user = await User.findById(row._id)
    if (!user) {
      console.warn('User not found, skip:', row._id)
      continue
    }

    const absPath = join(publicRoot, 'signatures', row.signatureFile)
    if (!fs.existsSync(absPath)) {
      console.error('Missing signature file:', absPath)
      process.exit(1)
    }
    const st = fs.statSync(absPath)

    if (user.bankSignatureFileId) {
      await SurveyFile.deleteOne({ _id: user.bankSignatureFileId })
    }

    const fileDoc = await SurveyFile.create({
      companyId: user.companyId,
      uploadedByUserId: user._id,
      storageProvider: 'local',
      key: `signatures/${row.signatureFile}`,
      url: row.signatureRelativeUrl,
      mimeType: 'image/png',
      sizeBytes: st.size,
      linked: { entityType: 'user_bank_signature', entityId: user._id },
    })

    user.bankDetails = row.bankDetails
    user.bankSignatureFileId = fileDoc._id
    await user.save()
    console.info('Updated bank details + signature for user', row._id, user.email)
  }

  console.info('Done.')
  await mongoose.connection.close()
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
