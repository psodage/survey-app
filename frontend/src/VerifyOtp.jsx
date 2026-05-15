import { ArrowLeft, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import http from './api/http'
import {
  RESET_EMAIL_KEY,
  RESET_STEP_AWAIT_OTP,
  RESET_STEP_KEY,
  RESET_STEP_SET_PASSWORD,
  authResetHttpConfig,
  clearAuthResetFlow,
} from './authResetFlow'
import { AuthShell } from './components/AuthShell'
import { useAuth } from './context/AuthContext'

export default function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const fromState = location.state?.email
    const stored = sessionStorage.getItem(RESET_EMAIL_KEY)
    const step = sessionStorage.getItem(RESET_STEP_KEY)
    const resolved = (typeof fromState === 'string' ? fromState : '') || stored || ''
    setEmail(resolved)
    if (!resolved || step !== RESET_STEP_AWAIT_OTP) {
      toast.error('Start from the forgot password page and send a code first.')
      clearAuthResetFlow()
      navigate('/forgot-password', { replace: true })
    }
  }, [location.state, navigate])

  if (!isLoading && token) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error('Enter the 6-digit code from your email.')
      return
    }
    setIsSubmitting(true)
    try {
      await http.post(
        '/api/auth/verify-reset-otp',
        { email: email.trim().toLowerCase(), otp: otp.trim() },
        authResetHttpConfig,
      )
      sessionStorage.setItem(RESET_STEP_KEY, RESET_STEP_SET_PASSWORD)
      toast.success('Code verified. Set your new password.')
      navigate('/reset-password', { replace: true, state: { email: email.trim().toLowerCase() } })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.error ?? 'Verification failed.'
        toast.error(msg)
      } else {
        toast.error('Verification failed.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onResend() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setIsResending(true)
    try {
      const res = await http.post('/api/auth/forgot-password', { email: trimmed }, authResetHttpConfig)
      if (res.data?.sent === true) {
        toast.success(res.data?.message ?? 'A new code was sent to your email.')
      } else {
        toast.message(
          res.data?.message ??
            'If an account is registered for this email, you will receive a code shortly.',
        )
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error ?? 'Could not resend the code.')
      } else {
        toast.error('Could not resend the code.')
      }
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthShell
      title="Verify code"
      subtitle="Enter the 6-digit OTP we sent to your inbox. It expires in 10 minutes."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-[15px] font-medium text-white/95" htmlFor="vo-email">
            Email
          </label>
          <input
            id="vo-email"
            type="email"
            readOnly
            value={email}
            className="h-11 w-full cursor-not-allowed rounded-xl border border-white/10 bg-black/20 px-4 text-[14px] text-white/75 outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[15px] font-medium text-white/95" htmlFor="vo-otp">
            One-time password
          </label>
          <div className="relative">
            <Shield className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-white/45" />
            <input
              id="vo-otp"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="h-11 w-full rounded-xl border border-white/12 bg-black/30 pr-4 pl-11 text-[18px] tracking-[0.35em] text-white placeholder:text-white/35 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/30"
            />
          </div>
          <p className="text-[13px] text-white/50">Do not share this code with anyone.</p>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#f39b03] to-[#f39b03] text-[16px] font-semibold text-white disabled:opacity-70"
        >
          {isSubmitting ? 'Verifying…' : 'Verify & continue'}
        </button>
        <p className="text-center text-[14px] text-white/70">
          <button
            type="button"
            disabled={isResending}
            onClick={onResend}
            className="font-medium text-[#f39b03] transition hover:text-[#f7b13a] disabled:opacity-60"
          >
            {isResending ? 'Sending…' : 'Resend code'}
          </button>
          <span className="mx-2 text-white/35">·</span>
          <Link to="/login" className="inline-flex items-center justify-center gap-2 font-medium text-[#f39b03] transition hover:text-[#f7b13a]">
            <ArrowLeft className="h-4 w-4" />
            Login
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
