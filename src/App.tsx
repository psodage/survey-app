import { type ReactNode, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom'
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

function ProtectedRoute({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Mobile: pick a manager. Desktop (md+): same URL redirects to default manager ledger. */
function AccountManagerIndex({ onNavigate }: { onNavigate: NavigateFunction }) {
  const location = useLocation()
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
        to={{ pathname: `/account-manager/${DEFAULT_ACCOUNT_MANAGER_ID}`, search: location.search }}
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
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoice"
        element={
          <ProtectedRoute>
            <Invoice onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account-manager"
        element={
          <ProtectedRoute>
            <AccountManagerIndex onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account-manager/:managerId"
        element={
          <ProtectedRoute>
            <AccountManager onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients-sites"
        element={
          <ProtectedRoute>
            <ClientsSites onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-site"
        element={
          <ProtectedRoute>
            <AddSite onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/site-visits"
        element={
          <ProtectedRoute>
            <AddSiteVisit onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-site-visit"
        element={
          <ProtectedRoute>
            <AddSiteVisit onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/site-details"
        element={
          <ProtectedRoute>
            <SiteDetails onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
