import { ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import http from './api/http'
import { AuthShell } from './components/AuthShell'
import { useAuth } from './context/AuthContext'

const RESET_EMAIL_KEY = 'survey_reset_email'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { token, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && token) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(event) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error('Enter your email address.')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await http.post('/api/auth/forgot-password', { email: trimmed })
      const message = res.data?.message ?? 'If an account is registered for this email, you will receive a code shortly.'
      sessionStorage.setItem(RESET_EMAIL_KEY, trimmed.toLowerCase())
      toast.success(message)
      navigate('/verify-reset-otp', { replace: true, state: { email: trimmed.toLowerCase() } })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.error ?? 'Something went wrong. Try again.'
        toast.error(msg)
      } else {
        toast.error('Something went wrong. Try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter the email on your account. If it is registered, we will send a 6-digit code (valid for 10 minutes)."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-[15px] font-medium text-white/95" htmlFor="fp-email">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-white/45" />
            <input
              id="fp-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/12 bg-black/30 pr-4 pl-11 text-[14px] text-white placeholder:text-white/42 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/30"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#f39b03] to-[#f39b03] text-[16px] font-semibold text-white disabled:opacity-70"
        >
          {isSubmitting ? 'Sending…' : 'Send reset code'}
        </button>
        <p className="text-center text-[14px] text-white/70">
          <Link to="/login" className="inline-flex items-center justify-center gap-2 font-medium text-[#f39b03] transition hover:text-[#f7b13a]">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
