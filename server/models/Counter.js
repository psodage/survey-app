import mongoose from 'mongoose'

const { Schema } = mongoose

const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false, collection: 'counters' },
)

export default mongoose.models.Counter || mongoose.model('Counter', counterSchema)
