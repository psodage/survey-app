import mongoose from 'mongoose'

const { Schema } = mongoose

const amcRecordSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    instrumentId: { type: Schema.Types.ObjectId, ref: 'Instrument', required: true, index: true },
    vendor: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date, required: true, index: true },
    amount: { type: Schema.Types.Decimal128 },
    invoiceFileId: { type: Schema.Types.ObjectId, ref: 'SurveyFile' },
    renewedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'amc_records' },
)

amcRecordSchema.index({ instrumentId: 1, endDate: -1 })

export default mongoose.models.AmcRecord || mongoose.model('AmcRecord', amcRecordSchema)
