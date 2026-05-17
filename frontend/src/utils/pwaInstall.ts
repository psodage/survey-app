/** BeforeInstallPromptEvent — not in all TS DOM libs */
export type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: DeferredInstallPrompt | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((cb) => cb())
}

/** Call once at app bootstrap (before React) so the event is not missed during startup screens. */
export function initPwaInstallCapture(): void {
  if (typeof window === 'undefined') return
  const w = window as Window & { __surveyosPwaInstallCapture?: boolean }
  if (w.__surveyosPwaInstallCapture) return
  w.__surveyosPwaInstallCapture = true

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as DeferredInstallPrompt
    notify()
  })

  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export function getDeferredInstallPrompt(): DeferredInstallPrompt | null {
  return deferred
}

export function clearDeferredInstallPrompt(): void {
  deferred = null
  notify()
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iOS Safari can add to home screen but has no beforeinstallprompt. */
export function isIosAddToHomeScreenContext(): boolean {
  if (typeof navigator === 'undefined' || isStandalonePwa()) return false
  const ua = navigator.userAgent
  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!isIos) return false
  return !/crios|fxios|edgios|opios/i.test(ua)
}

const DISMISS_KEY = 'surveyos-install-prompt-dismissed'
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000

export function isInstallPromptDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const at = Number(raw)
    if (!Number.isFinite(at)) return false
    return Date.now() - at < DISMISS_MS
  } catch {
    return false
  }
}

export function dismissInstallPrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}
