import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { registerSW } from 'virtual:pwa-register'
import { initPwaInstallCapture } from './utils/pwaInstall'
import { initIosKeyboardViewport } from './utils/iosKeyboardViewport'
import { initPwaZoomLock } from './utils/pwaZoomLock'
import './index.css'

initPwaInstallCapture()
initPwaZoomLock()
initIosKeyboardViewport()
import App from './App.tsx'
import { AuthReadyGate } from './components/AuthReadyGate'
import ServerWakeUp from './components/ServerWakeUp'
import { AuthProvider } from './context/AuthContext'
import { LoadingProvider } from './context/LoadingContext'
import { RefreshProvider } from './context/RefreshContext'
import { SelectedYearProvider } from './context/SelectedYearContext'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ServerWakeUp>
        <LoadingProvider>
          <AuthProvider>
            <AuthReadyGate>
              <SelectedYearProvider>
                <RefreshProvider>
                  <App />
                  <Toaster richColors position="top-center" />
                </RefreshProvider>
              </SelectedYearProvider>
            </AuthReadyGate>
          </AuthProvider>
        </LoadingProvider>
      </ServerWakeUp>
    </BrowserRouter>
  </StrictMode>,
)
