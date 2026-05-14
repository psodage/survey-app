import mongoose from 'mongoose'

const { Schema } = mongoose

const accountManagerSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** When set, peers with the same instrument can view this ledger (read-only) if they also have an AM on this instrument. */
    instrumentId: { type: Schema.Types.ObjectId, ref: 'Instrument', index: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    fullName: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'account_managers' },
)

accountManagerSchema.index({ companyId: 1, adminId: 1, slug: 1 }, { unique: true })
accountManagerSchema.index({ companyId: 1, instrumentId: 1, isActive: 1 })

export default mongoose.models.AccountManager ||
  mongoose.model('AccountManager', accountManagerSchema)
