import mongoose from 'mongoose'

const { Schema } = mongoose

const clientSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    instrumentId: { type: Schema.Types.ObjectId, ref: 'Instrument', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    notes: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true, collection: 'clients' },
)

clientSchema.index({ companyId: 1, adminId: 1, instrumentId: 1, name: 1 })

export default mongoose.models.Client || mongoose.model('Client', clientSchema)
