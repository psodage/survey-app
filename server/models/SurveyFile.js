import mongoose from 'mongoose'

const { Schema } = mongoose

const surveyFileSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    uploadedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storageProvider: {
      type: String,
      enum: ['s3', 'local', 'r2', 'cloudinary'],
      default: 'cloudinary',
    },
    bucket: { type: String, trim: true },
    key: { type: String, required: true, trim: true },
    url: { type: String, trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    checksumSha256: { type: String, trim: true },
    linked: {
      entityType: {
        type: String,
        enum: [
          'company_branding',
          'site_visit',
          'invoice_attachment',
          'user_avatar',
          'other',
          'invoice_signature',
          'invoice_stamp',
          'user_bank_signature',
        ],
      },
      entityId: { type: Schema.Types.ObjectId },
    },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'files' },
)

surveyFileSchema.index({ companyId: 1, 'linked.entityType': 1, 'linked.entityId': 1 })

export default mongoose.models.SurveyFile || mongoose.model('SurveyFile', surveyFileSchema)
