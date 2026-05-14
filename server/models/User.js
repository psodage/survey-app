import mongoose from 'mongoose'

const { Schema } = mongoose

const bankDetailsSchema = new Schema(
  {
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    bankName: { type: String, trim: true },
    branch: { type: String, trim: true },
    upiPhone: { type: String, trim: true },
    /** 1 = left column on dual-bank PDF invoice, 2 = right column */
    invoiceSlot: { type: Number, enum: [1, 2] },
  },
  { _id: false },
)

const userSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'admin'],
      required: true,
      index: true,
    },
    profile: {
      fullName: { type: String, trim: true },
      phone: { type: String, trim: true },
      avatarFileId: { type: Schema.Types.ObjectId, ref: 'SurveyFile' },
    },
    bankDetails: bankDetailsSchema,
    bankSignatureFileId: { type: Schema.Types.ObjectId, ref: 'SurveyFile' },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
    resetOtp: { type: String, select: false },
    resetOtpExpiry: { type: Date },
    resetOtpVerified: { type: Boolean, default: false },
    resetOtpSentAt: { type: Date },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      language: { type: String, default: 'en', trim: true },
    },
  },
  { timestamps: true, collection: 'users' },
)

userSchema.index({ companyId: 1, email: 1 }, { unique: true })
userSchema.index({ companyId: 1, role: 1, isActive: 1 })
userSchema.index({ companyId: 1, 'bankDetails.invoiceSlot': 1 })

export default mongoose.models.User || mongoose.model('User', userSchema)
