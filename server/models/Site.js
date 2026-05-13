import mongoose from 'mongoose'

const { Schema } = mongoose

const siteSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    instrumentId: { type: Schema.Types.ObjectId, ref: 'Instrument', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    name: { type: String, required: true, trim: true },
    locationLabel: { type: String, trim: true },
    address: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'on_hold', 'completed'],
      default: 'active',
      index: true,
    },
    geo: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: undefined },
    },
    lastVisitAt: { type: Date },
  },
  { timestamps: true, collection: 'sites' },
)

siteSchema.index({ clientId: 1, status: 1 })
siteSchema.index({ companyId: 1, adminId: 1, instrumentId: 1, updatedAt: -1 })

export default mongoose.models.Site || mongoose.model('Site', siteSchema)
