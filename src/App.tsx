import { type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AccountManager from './AccountManager'
import AddSite from './AddSite'
import AddSiteVisit from './AddSiteVisit'
import ClientsSites from './ClientsSites'
import Dashboard from './Dashboard'
import MeasurementRateCalculator from './MeasurementRateCalculator'
import SiteDetails from './SiteDetails'
import Settings from './Settings'
import InstallAppPrompt from './components/InstallAppPrompt'
import Login from './Login.jsx'

function ProtectedRoute({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-[#050505] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-[#f39b03]/30 bg-black/40 p-8 shadow-[0_0_80px_rgba(243,155,3,0.12)] backdrop-blur">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#f39b03]/90 uppercase">
          Samarth Land Surveyor
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm text-white/70 sm:text-base">
          This section is route-enabled. You can replace this placeholder with the full page content
          anytime.
        </p>
      </div>
    </div>
  )
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
        path="/measurement-rate-calculator"
        element={
          <ProtectedRoute>
            <MeasurementRateCalculator onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account-manager"
        element={
          <ProtectedRoute>
            <AccountManager onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account-manager/debits"
        element={
          <ProtectedRoute>
            <AccountManager viewMode="debits" onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account-manager/credits"
        element={
          <ProtectedRoute>
            <AccountManager viewMode="credits" onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account-manager/pending"
        element={
          <ProtectedRoute>
            <AccountManager viewMode="pending" onNavigate={navigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account-manager/net-balance"
        element={
          <ProtectedRoute>
            <AccountManager viewMode="net" onNavigate={navigate} />
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
            <PlaceholderPage title="Reports" />
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
      <InstallAppPrompt />
    </>
  )
}
