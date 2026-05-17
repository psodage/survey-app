/** True when the login field looks like an email address. */
export function isEmailLoginIdentifier(raw) {
  const s = String(raw ?? '').trim()
  return s.length > 0 && s.includes('@')
}

/** Last 10 digits for Indian mobile numbers (ignores +91, spaces, dashes). */
export function phoneDigitsForLogin(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.slice(-10)
}

/** Mongo regex: profile.phone ends with these 10 digits (non-digits allowed before). */
export function phoneSuffixRegex(last10) {
  const escaped = last10.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${escaped}$`)
}
