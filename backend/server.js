import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import { connectMongo, registerMongoShutdownHandlers } from './config/db.js'
import { configureCloudinary } from './config/cloudinary.js'
import './models/index.js'
import apiRouter from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'

if (!env.mongodbUri) {
  console.error('MongoDB connection string is required (set MONGO_URI or MONGODB_URI)')
  process.exit(1)
}

if (
  env.nodeEnv === 'production' &&
  (!env.jwtSecret || env.jwtSecret === 'dev-only-change-in-production')
) {
  console.error('JWT_SECRET must be set to a strong random value in production')
  process.exit(1)
}

configureCloudinary()
registerMongoShutdownHandlers()

const app = express()
app.set('trust proxy', 1)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true)
      if (env.frontendOrigins.includes(origin)) return cb(null, true)
      if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true)
      cb(null, false)
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))

app.use('/api', apiRouter)

app.use(errorHandler)

try {
  await connectMongo(env.mongodbUri)
  console.info('MongoDB connected:', mongoose.connection.name)

  app.listen(env.port, () => {
    console.info(`API http://localhost:${env.port}`)
  })
} catch (err) {
  console.error('Server failed to start', err)
  process.exit(1)
}
