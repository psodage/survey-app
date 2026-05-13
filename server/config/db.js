import mongoose from 'mongoose'

export async function connectMongo(uri) {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15_000,
  })
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error', err)
  })
  return mongoose.connection
}

export function registerMongoShutdownHandlers() {
  const shutdown = async (signal) => {
    try {
      await mongoose.connection.close()
      console.info(`MongoDB disconnected (${signal})`)
    } catch (err) {
      console.error('Error closing MongoDB connection', err)
    }
    process.exit(0)
  }
  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}
