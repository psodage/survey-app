import mongoose from 'mongoose'

const { Schema } = mongoose

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    legalName: { type: String, trim: true },
    ownerName: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    officeAddress: { type: String, trim: true },
    gstNumber: { type: String, trim: true, uppercase: true },
    branding: {
      logoFileId: { type: Schema.Types.ObjectId, ref: 'SurveyFile' },
    },
    invoiceDefaults: {
      theme: { type: String, default: 'modern', trim: true },
      footerNote: { type: String, trim: true },
      signatureFileId: { type: Schema.Types.ObjectId, ref: 'SurveyFile' },
      stampFileId: { type: Schema.Types.ObjectId, ref: 'SurveyFile' },
    },
    settings: {
      currency: { type: String, default: 'INR', trim: true },
      dateFormat: { type: String, default: 'DD/MM/YYYY', trim: true },
      defaultInstrumentTypeLabel: { type: String, trim: true },
      notificationsEnabled: { type: Boolean, default: true },
      autoBackupEnabled: { type: Boolean, default: true },
      lastBackupAt: { type: Date },
    },
    storageQuotaBytes: { type: Number, default: 25 * 1024 ** 3 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'companies' },
)

companySchema.index({ isActive: 1 })

export default mongoose.models.Company || mongoose.model('Company', companySchema)
