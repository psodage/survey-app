import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  clearDeferredInstallPrompt,
  dismissInstallPrompt,
  getDeferredInstallPrompt,
  isInstallPromptDismissed,
  isIosAddToHomeScreenContext,
  isStandalonePwa,
  subscribeInstallPrompt,
} from '../utils/pwaInstall'

export default function InstallPrompt() {
  const deferredPrompt = useSyncExternalStore(
    subscribeInstallPrompt,
    getDeferredInstallPrompt,
    () => null,
  )
  const [dismissed, setDismissed] = useState(() => isInstallPromptDismissed())
  const [iosHintReady, setIosHintReady] = useState(false)

  useEffect(() => {
    if (isStandalonePwa() || dismissed) return
    if (!isIosAddToHomeScreenContext()) return
    const id = window.setTimeout(() => setIosHintReady(true), 1200)
    return () => window.clearTimeout(id)
  }, [dismissed])

  const handleInstall = async () => {
    const prompt = getDeferredInstallPrompt()
    if (!prompt?.prompt) return
    await prompt.prompt()
    await prompt.userChoice
    clearDeferredInstallPrompt()
  }

  const handleDismiss = () => {
    setDismissed(true)
    dismissInstallPrompt()
  }

  const chromeInstallable = Boolean(deferredPrompt) && !dismissed
  const iosInstallable = iosHintReady && isIosAddToHomeScreenContext() && !dismissed

  if (!chromeInstallable && !iosInstallable) return null

  return (
    <div
      className="fixed right-4 bottom-4 z-[10000] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[#f39b03]/40 bg-black/90 p-4 text-white shadow-[0_0_40px_rgba(243,155,3,0.25)] backdrop-blur"
      role="dialog"
      aria-label="Install app"
    >
      <p className="text-xs font-semibold tracking-[0.18em] text-[#f39b03] uppercase">Install app</p>
      {iosInstallable && !chromeInstallable ? (
        <p className="mt-2 text-sm text-white/85">
          Add Samarth Land Surveyor to your home screen: tap{' '}
          <span className="font-semibold text-white">Share</span>
          {' '}
          <span aria-hidden="true">□↑</span>
          {' '}
          then{' '}
          <span className="font-semibold text-white">Add to Home Screen</span>.
        </p>
      ) : (
        <p className="mt-2 text-sm text-white/85">
          Add Samarth Land Surveyor to your home screen for a full-screen, app-like experience.
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {chromeInstallable ? (
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-lg bg-[#f39b03] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
          >
            Install App
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/80 transition hover:border-white/40 hover:text-white"
        >
          {chromeInstallable ? 'Later' : 'Got it'}
        </button>
      </div>
    </div>
  )
}
