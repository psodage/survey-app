import mongoose from 'mongoose'

const { Schema } = mongoose

const instrumentAssignmentSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    instrumentId: { type: Schema.Types.ObjectId, ref: 'Instrument', required: true, index: true },
    assignedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: () => new Date() },
    revokedAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'instrument_assignments' },
)

instrumentAssignmentSchema.index({ adminId: 1, isActive: 1 })
instrumentAssignmentSchema.index({ instrumentId: 1, isActive: 1 })
instrumentAssignmentSchema.index({ companyId: 1, adminId: 1, instrumentId: 1 })

export default mongoose.models.InstrumentAssignment ||
  mongoose.model('InstrumentAssignment', instrumentAssignmentSchema)
