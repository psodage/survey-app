import mongoose from 'mongoose'

const { Schema } = mongoose

const subscriptionSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
    planName: { type: String, trim: true },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    billingEmail: { type: String, lowercase: true, trim: true },
    externalCustomerId: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true, collection: 'subscriptions' },
)

export default mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema)
