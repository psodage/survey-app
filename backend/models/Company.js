import mongoose from 'mongoose'

const { Schema } = mongoose

const companySchema = new Schema(
  {
    /** Shown on invoices, settings, etc. */
    name: { type: String, required: true, trim: true },
    legalName: { type: String, trim: true },
    ownerName: { type: String, trim: true },
    /** Invoice / letterhead contact line when set */
    contactPhone: { type: String, trim: true },
    /** Company email (invoice header, company settings) */
    email: { type: String, lowercase: true, trim: true },
    /** Full postal / office address (invoice header) */
    officeAddress: { type: String, trim: true },
    /** GSTIN — omit or leave empty if not registered */
    gstNumber: { type: String, trim: true, uppercase: true },
    /** Invoice logo via uploaded `SurveyFile` (URL used in PDF) */
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
