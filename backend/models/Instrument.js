import mongoose from 'mongoose'

const { Schema } = mongoose

const instrumentSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    status: {
      type: String,
      enum: ['operational', 'maintenance', 'retired'],
      default: 'operational',
      index: true,
    },
    purchaseDate: { type: Date },
    notes: { type: String, trim: true },
    currentAmc: {
      vendor: { type: String, trim: true },
      validUntil: { type: Date },
      planName: { type: String, trim: true },
    },
  },
  { timestamps: true, collection: 'instruments' },
)

instrumentSchema.index({ companyId: 1, serialNumber: 1 })

export default mongoose.models.Instrument || mongoose.model('Instrument', instrumentSchema)
