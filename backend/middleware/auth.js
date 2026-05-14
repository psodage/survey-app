import { verifyAccessToken } from '../utils/token.js'
import { ApiError } from '../utils/ApiError.js'
import User from '../models/User.js'

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required')
    }
    const token = header.slice(7)
    const decoded = verifyAccessToken(token)
    const user = await User.findById(decoded.sub).select('companyId email role isActive profile').lean()
    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid or inactive user')
    }
    req.user = {
      id: user._id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
      profile: user.profile,
    }
    req.token = token
    next()
  } catch (e) {
    if (e instanceof ApiError) return next(e)
    next(new ApiError(401, 'Invalid or expired token'))
  }
}

export function optionalAuthenticate(req, _res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next()
  authenticate(req, _res, next)
}
