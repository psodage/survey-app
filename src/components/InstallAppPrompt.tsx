import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    const onInstalled = () => {
      setIsVisible(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[#f39b03]/40 bg-black/90 p-4 text-white shadow-[0_0_40px_rgba(243,155,3,0.25)] backdrop-blur">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#f39b03] uppercase">Install app</p>
      <p className="mt-2 text-sm text-white/85">
        Add Samarth to your home screen for a full-screen, app-like experience.
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
          onClick={() => setIsVisible(false)}
          className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/80 transition hover:border-white/40 hover:text-white"
        >
          Later
        </button>
      </div>
    </div>
  )
}
