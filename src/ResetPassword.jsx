import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import http from './api/http'
import { AuthShell } from './components/AuthShell'
import { useAuth } from './context/AuthContext'

const RESET_EMAIL_KEY = 'survey_reset_email'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showA, setShowA] = useState(false)
  const [showB, setShowB] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fromState = location.state?.email
    const stored = sessionStorage.getItem(RESET_EMAIL_KEY)
    const resolved = (typeof fromState === 'string' ? fromState : '') || stored || ''
    setEmail(resolved)
    if (!resolved) {
      toast.error('Verify your code first.')
      navigate('/forgot-password', { replace: true })
    }
  }, [location.state, navigate])

  if (!isLoading && token) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(event) {
    event.preventDefault()
    const e = email.trim().toLowerCase()
    if (!e) {
      toast.error('Missing email for this session.')
      return
    }
    setIsSubmitting(true)
    try {
      await http.post('/api/auth/reset-password', {
        email: e,
        newPassword: password,
        confirmPassword: confirm,
      })
      sessionStorage.removeItem(RESET_EMAIL_KEY)
      toast.success('Password updated. Sign in with your new password.')
      navigate('/login', { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data
        const fe = data?.details?.fieldErrors
        const fieldMsg = fe?.confirmPassword?.[0] ?? fe?.newPassword?.[0]
        const msg = fieldMsg ?? data?.error ?? 'Could not reset password.'
        toast.error(msg)
      } else {
        toast.error('Could not reset password.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="New password"
      subtitle="Use at least 8 characters with upper & lower case, a number, and a symbol."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-[15px] font-medium text-white/95" htmlFor="rp-email">
            Email
          </label>
          <input
            id="rp-email"
            type="email"
            readOnly
            value={email}
            className="h-11 w-full cursor-not-allowed rounded-xl border border-white/10 bg-black/20 px-4 text-[14px] text-white/75 outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[15px] font-medium text-white/95" htmlFor="rp-pass">
            New password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-white/45" />
            <input
              id="rp-pass"
              type={showA ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/12 bg-black/30 py-0 pr-11 pl-11 text-[14px] text-white placeholder:text-white/42 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/30"
              placeholder="Strong password"
            />
            <button
              type="button"
              aria-label={showA ? 'Hide password' : 'Show password'}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-white/55 hover:text-white/85"
              onClick={() => setShowA((v) => !v)}
            >
              {showA ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[15px] font-medium text-white/95" htmlFor="rp-confirm">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-white/45" />
            <input
              id="rp-confirm"
              type={showB ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/12 bg-black/30 py-0 pr-11 pl-11 text-[14px] text-white placeholder:text-white/42 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/30"
              placeholder="Repeat password"
            />
            <button
              type="button"
              aria-label={showB ? 'Hide password' : 'Show password'}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-white/55 hover:text-white/85"
              onClick={() => setShowB((v) => !v)}
            >
              {showB ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#f39b03] to-[#f39b03] text-[16px] font-semibold text-white disabled:opacity-70"
        >
          {isSubmitting ? 'Updating…' : 'Update password'}
        </button>
        <p className="pt-1 text-center text-[14px] text-white/70">
          <Link to="/login" className="inline-flex items-center justify-center gap-2 font-medium text-[#f39b03] transition hover:text-[#f7b13a]">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
