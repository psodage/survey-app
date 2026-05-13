import mongoose from 'mongoose'

const { Schema } = mongoose

const transactionSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    accountManagerId: { type: Schema.Types.ObjectId, ref: 'AccountManager', required: true, index: true },
    instrumentId: { type: Schema.Types.ObjectId, ref: 'Instrument', index: true },
    type: { type: String, enum: ['debit', 'credit'], required: true, index: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    occurredOn: { type: Date, required: true, index: true },
    reason: { type: String, trim: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site' },
    siteVisitId: { type: Schema.Types.ObjectId, ref: 'SiteVisit' },
    reference: { type: String, trim: true },
  },
  { timestamps: true, collection: 'transactions' },
)

transactionSchema.index({ accountManagerId: 1, occurredOn: -1 })

export default mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema)
