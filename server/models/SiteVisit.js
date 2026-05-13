import mongoose from 'mongoose'

const { Schema } = mongoose

const siteVisitSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    instrumentId: { type: Schema.Types.ObjectId, ref: 'Instrument', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    visitCode: { type: String, trim: true, uppercase: true },
    visitDate: { type: Date, required: true, index: true },
    workDescription: { type: String, trim: true },
    machineLabel: { type: String, trim: true },
    billingParticular: { type: String, trim: true },
    billingQuantity: { type: Number },
    billingRate: { type: Number },
    billingOtherCharges: { type: Number },
    amount: { type: Schema.Types.Decimal128 },
    paymentMode: { type: String, trim: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'waived'],
      default: 'pending',
      index: true,
    },
    notes: { type: String, trim: true },
    photoFileIds: [{ type: Schema.Types.ObjectId, ref: 'SurveyFile' }],
    /** Denormalized HTTPS URLs for fast client render (kept in sync when photos uploaded). */
    photoUrls: [{ type: String, trim: true }],
    accountManagerId: { type: Schema.Types.ObjectId, ref: 'AccountManager', index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  },
  { timestamps: true, collection: 'site_visits' },
)

siteVisitSchema.index({ siteId: 1, visitDate: -1 })
siteVisitSchema.index({ companyId: 1, adminId: 1, instrumentId: 1, visitDate: -1 })

export default mongoose.models.SiteVisit || mongoose.model('SiteVisit', siteVisitSchema)
