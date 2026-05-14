import { useEffect, useState } from 'react'
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  type NavigateFunction,
} from 'react-router-dom'
import AccountManager from './AccountManager'
import AccountManagerSelect from './AccountManagerSelect'
import { DEFAULT_ACCOUNT_MANAGER_ID } from './accountManagersData'
import AddSite from './AddSite'
import AddSiteVisit from './AddSiteVisit'
import ClientsSites from './ClientsSites'
import Dashboard from './Dashboard'
import Invoice from './Invoice'
import Reports from './Reports'
import { SiteDetails } from './SiteDetails'
import Settings from './Settings'
import InstallPrompt from './components/InstallPrompt.jsx'
import Login from './Login.jsx'
import ForgotPassword from './ForgotPassword.jsx'
import VerifyOtp from './VerifyOtp.jsx'
import ResetPassword from './ResetPassword.jsx'
import { useAuth } from './context/AuthContext'

function AuthLoading() {
  return <div className="min-h-[100svh] bg-neutral-100 md:bg-neutral-100" aria-busy="true" />
}

const PUBLIC_PATHS = new Set(['/login', '/forgot-password', '/verify-reset-otp', '/reset-password'])

/** Require a session for app routes; allow login + full password-reset flow without a session. */
function AuthBoundary() {
  const { token, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) {
    return <AuthLoading />
  }
  if (!token && !PUBLIC_PATHS.has(location.pathname)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (token && PUBLIC_PATHS.has(location.pathname) && location.pathname !== '/login') {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}

function HomeRedirect() {
  const { token, isLoading } = useAuth()
  if (isLoading) {
    return <AuthLoading />
  }
  return <Navigate to={token ? '/dashboard' : '/login'} replace />
}

function CatchAllRedirect() {
  const { token, isLoading } = useAuth()
  if (isLoading) {
    return <AuthLoading />
  }
  return <Navigate to={token ? '/dashboard' : '/login'} replace />
}

/** Mobile: pick a manager. Desktop (md+): same URL redirects to default manager ledger. */
function AccountManagerIndex({ onNavigate }: { onNavigate: NavigateFunction }) {
  const location = useLocation()
  const { managers } = useAuth()
  const defaultSlug = managers[0]?.id ?? DEFAULT_ACCOUNT_MANAGER_ID
  const [mdUp, setMdUp] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setMdUp(mq.matches)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  if (mdUp) {
    return (
      <Navigate
        to={{ pathname: `/account-manager/${defaultSlug}`, search: location.search }}
        replace
      />
    )
  }
  return <AccountManagerSelect onNavigate={onNavigate} />
}

function AppRoutes() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <Routes location={location}>
      <Route element={<AuthBoundary />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard onNavigate={navigate} />} />
        <Route path="/invoice" element={<Invoice onNavigate={navigate} />} />
        <Route path="/account-manager" element={<AccountManagerIndex onNavigate={navigate} />} />
        <Route path="/account-manager/:managerId" element={<AccountManager onNavigate={navigate} />} />
        <Route path="/clients-sites" element={<ClientsSites onNavigate={navigate} />} />
        <Route path="/add-site" element={<AddSite onNavigate={navigate} />} />
        <Route path="/site-visits" element={<AddSiteVisit onNavigate={navigate} />} />
        <Route path="/add-site-visit" element={<AddSiteVisit onNavigate={navigate} />} />
        <Route path="/site-details" element={<SiteDetails onNavigate={navigate} />} />
        <Route path="/reports" element={<Reports onNavigate={navigate} />} />
        <Route path="/settings" element={<Settings onNavigate={navigate} />} />
        <Route path="*" element={<CatchAllRedirect />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <>
      <AppRoutes />
      <InstallPrompt />
    </>
  )
}
