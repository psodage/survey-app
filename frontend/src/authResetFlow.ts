/** Client-only markers for the forgot-password → OTP → new-password flow. */
export const RESET_EMAIL_KEY = 'survey_reset_email'
export const RESET_STEP_KEY = 'survey_reset_step'

/** Forgot-password API succeeded; user may open the OTP screen. */
export const RESET_STEP_AWAIT_OTP = 'await_otp'
/** OTP verified; user may set a new password. */
export const RESET_STEP_SET_PASSWORD = 'set_password'

export function clearAuthResetFlow() {
  try {
    sessionStorage.removeItem(RESET_EMAIL_KEY)
    sessionStorage.removeItem(RESET_STEP_KEY)
  } catch {
    /* ignore */
  }
}
