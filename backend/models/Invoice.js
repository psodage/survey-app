import mongoose from 'mongoose'

const { Schema } = mongoose

const invoiceLineSchema = new Schema(
  {
    description: { type: String, trim: true },
    quantity: { type: Number },
    unit: { type: String, trim: true },
    unitRate: { type: Schema.Types.Decimal128 },
    lineTotal: { type: Schema.Types.Decimal128 },
  },
  { _id: false },
)

const invoiceSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    instrumentId: { type: Schema.Types.ObjectId, ref: 'Instrument', required: true, index: true },
    invoiceNumber: { type: String, required: true, trim: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site' },
    siteVisitIds: [{ type: Schema.Types.ObjectId, ref: 'SiteVisit' }],
    workType: { type: String, trim: true },
    totalPoints: { type: Number },
    ratePerPoint: { type: Schema.Types.Decimal128 },
    subtotal: { type: Schema.Types.Decimal128 },
    taxRatePercent: { type: Number },
    taxAmount: { type: Schema.Types.Decimal128 },
    grandTotal: { type: Schema.Types.Decimal128 },
    currency: { type: String, default: 'INR', trim: true },
    lines: [invoiceLineSchema],
    pdfFileId: { type: Schema.Types.ObjectId, ref: 'SurveyFile' },
    status: {
      type: String,
      enum: ['draft', 'issued', 'void'],
      default: 'issued',
      index: true,
    },
  },
  { timestamps: true, collection: 'invoices' },
)

invoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true })
invoiceSchema.index({ clientId: 1, issueDate: -1 })

export default mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema)
