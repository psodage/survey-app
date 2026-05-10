import { useEffect, useState } from 'react'

function isRunningAsInstalledPwa() {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)')
  if (mq.matches) return true
  /** iOS Safari home screen */
  if (typeof window.navigator !== 'undefined' && window.navigator.standalone === true) return true
  return false
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isRunningAsInstalledPwa()) return

    /** @type {(e: Event) => void} */
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const onInstalled = () => {
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    if (!deferredPrompt || dismissed) return
    const id = window.setTimeout(() => setDismissed(true), 7500)
    return () => window.clearTimeout(id)
  }, [deferredPrompt, dismissed])

  const handleInstall = async () => {
    if (!deferredPrompt?.prompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  const installable = Boolean(deferredPrompt) && !dismissed

  if (!installable) return null

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[#f39b03]/40 bg-black/90 p-4 text-white shadow-[0_0_40px_rgba(243,155,3,0.25)] backdrop-blur">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#f39b03] uppercase">Install app</p>
      <p className="mt-2 text-sm text-white/85">
        Add Samrath Land Surveyor to your home screen for a full-screen, app-like experience.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-lg bg-[#f39b03] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Install App
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/80 transition hover:border-white/40 hover:text-white"
        >
          Later
        </button>
      </div>
    </div>
  )
}
