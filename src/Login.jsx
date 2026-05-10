import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarCheck,
  EyeOff,
  Eye,
  Lock,
  ShieldCheck,
  User,
  Users,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { layoutBrandLogo } from './brandLogo'

const features = [
  { icon: Users, title: 'Client & Site', subtitle: 'Management' },
  { icon: CalendarCheck, title: 'Site Visit', subtitle: 'Tracking' },
  { icon: BarChart3, title: 'Reports &', subtitle: 'Analytics' },
]

const LogoBlock = ({ centered = false }) => (
  <div className={`flex items-center ${centered ? 'justify-center' : 'justify-start'}`}>
    <img
      src={layoutBrandLogo}
      alt="समर्थ LAND SURVEYOR'S"
      className="h-auto w-[170px] object-contain sm:w-[190px] lg:w-[200px]"
      draggable={false}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onAuxClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onContextMenu={(event) => {
        event.preventDefault()
      }}
      onError={(event) => {
        event.currentTarget.style.display = 'none'
        const fallback = event.currentTarget.nextElementSibling
        if (fallback) fallback.classList.remove('hidden')
      }}
    />
    <div className="hidden">
      <p className="text-[34px] leading-[0.95] font-bold tracking-tight text-[#f39b03]">समर्थ</p>
      <p className="mt-1 text-[11px] font-semibold tracking-[0.24em] text-white">LAND SURVEYOR&apos;S</p>
    </div>
  </div>
)

const InputField = ({
  label,
  type = 'text',
  placeholder,
  leftIcon: LeftIcon,
  rightSlot,
  labelClassName = '',
  containerClassName = '',
  value,
  onChange,
}) => (
  <div className={`space-y-2 ${containerClassName}`}>
    <label className={`text-[15px] font-medium text-white/95 ${labelClassName}`}>{label}</label>
    <div className="relative">
      <LeftIcon className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-white/45" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-white/12 bg-black/30 pr-11 pl-11 text-[14px] text-white placeholder:text-white/42 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/30"
      />
      {rightSlot ? <div className="absolute top-1/2 right-4 -translate-y-1/2 text-white/45">{rightSlot}</div> : null}
    </div>
  </div>
)

const GoogleLogo = () => (
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.41 4.337-17.694 10.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.193l-6.19-5.238C29.143 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.434 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303a12.063 12.063 0 0 1-4.084 5.571h.003l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
)

function Login() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      setIdentifier('')
      setPassword('')
      navigate('/dashboard', { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/login-bg.png')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#020307]/72 via-[#050c16]/62 to-[#02050c]/74" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(243,155,3,0.10),transparent_42%),radial-gradient(circle_at_12%_80%,rgba(29,78,216,0.14),transparent_46%)]" />

      <section className="relative z-10 grid min-h-screen w-full grid-cols-1 px-4 py-5 md:px-8 lg:grid-cols-[44%_56%] lg:px-10 lg:py-6">
        <aside className="hidden h-full flex-col justify-between px-2 py-7 lg:flex xl:px-6">
          <LogoBlock />

          <div className="max-w-[430px] space-y-7">
            <div className="h-1 w-14 rounded-full bg-[#f39b03]" />

            <div className="space-y-2">
              <h1 className="text-[44px] leading-[1.06] font-semibold tracking-tight text-white xl:text-[46px]">
                Smart Surveying.
                <br />
                <span className="whitespace-nowrap">
                  Better <span className="text-[#f39b03]">Management.</span>
                </span>
              </h1>
              <p className="max-w-md text-[16px] leading-relaxed text-[#d2d7df]">
                Manage your sites, visits, clients
                <br />
                and accounts in one place.
              </p>
            </div>

            <div className="space-y-3.5">
              {features.map(({ icon: Icon, title, subtitle }) => (
                <div key={title} className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#f39b03]/85 bg-[#f39b03]/10">
                    <Icon className="h-[18px] w-[18px] text-[#f39b03]" />
                  </div>
                  <div className="text-[16px] leading-[1.05] tracking-tight text-white/95">
                    <span className="font-semibold">{title}</span>
                    <br />
                    <span className="font-medium text-white/85">{subtitle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[16px] text-white/90">
            <ShieldCheck className="h-[18px] w-[18px] text-[#f39b03]" />
            <span className="leading-none">Secure</span>
      
            <BadgeCheck className="h-[18px] w-[18px] text-[#f39b03]" />
            <span className="leading-none">Reliable</span>
            
            <Zap className="h-[18px] w-[18px] text-[#f39b03]" />
            <span className="leading-none">Efficient</span>
          </div>
        </aside>

        <div className="flex items-center justify-center lg:justify-center">
          <div className="w-full max-w-[560px] rounded-[10px] border border-white/15 bg-[linear-gradient(160deg,rgba(10,14,20,.76),rgba(8,11,17,.66))] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-6 md:p-7 lg:p-8">
            <div className="mb-6">
              <LogoBlock centered />
            </div>

            <div className="mb-6 text-center">
              <h2 className="text-[34px] leading-tight font-bold text-white sm:text-[36px]">Welcome Back!</h2>
              <p className="mt-1 text-[20px] text-white/58 sm:text-[22px]">Login to your account</p>
            </div>

            <form className="space-y-4.5" onSubmit={onSubmit}>
              <InputField
                label="Email or Mobile Number"
                placeholder="Enter email or mobile number"
                leftIcon={User}
                containerClassName="space-y-3"
                labelClassName="mb-2 block"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[15px] font-medium text-white/95">Password</label>
                  <a href="#" className="text-[14px] font-medium text-[#f39b03] transition hover:text-[#f7b13a]">
                    Forgot Password?
                  </a>
                </div>
                <InputField
                  label=""
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  leftIcon={Lock}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="cursor-pointer text-white/60 transition hover:text-white/85"
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-white/90 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border border-white/35 bg-transparent accent-[#f39b03]"
                />
                Remember me
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative mt-1 flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#f39b03] to-[#f39b03] text-[16px] font-semibold text-white disabled:opacity-70"
              >
                <span className="absolute left-1/2 -translate-x-1/2">{isSubmitting ? 'Logging in…' : 'Login'}</span>
                <ArrowRight className="absolute right-4 h-[18px] w-[18px]" />
              </button>

              <div className="flex items-center gap-4 text-sm tracking-wide text-white/45">
                <div className="h-px flex-1 bg-white/16" />
                <span>OR</span>
                <div className="h-px flex-1 bg-white/16" />
              </div>

              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-transparent text-[16px] font-medium text-white transition hover:border-white/35 hover:bg-white/5"
              >
                <GoogleLogo />
                Login with Google
              </button>

              <p className="pt-1 text-center text-[14px] text-white/70">
                <a href="#" className="font-medium text-[#f39b03] transition hover:text-[#f7b13a]">
               
                </a>
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Login
