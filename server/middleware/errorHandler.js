import { ApiError } from '../utils/ApiError.js'

export function errorHandler(err, _req, res, _next) {
  const status = err instanceof ApiError ? err.statusCode : err.statusCode || 500
  const message = err instanceof ApiError ? err.message : err.message || 'Internal Server Error'
  const details = err instanceof ApiError ? err.details : undefined

  if (status === 500 && process.env.NODE_ENV !== 'development') {
    console.error(err)
  } else if (status >= 500) {
    console.error(err)
  }

  res.status(status).json({
    ok: false,
    error: message,
    ...(details ? { details } : {}),
  })
}
