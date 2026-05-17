const DOUBLE_TAP_MS = 300

function isIosTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return (
    target.closest(
      'input, textarea, select, option, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
    ) !== null
  )
}

function onGesture(e: Event): void {
  e.preventDefault()
}

function onTouchMove(e: TouchEvent): void {
  if (e.touches.length > 1) {
    e.preventDefault()
  }
}

function onTouchEnd(e: TouchEvent): void {
  if (isEditableTarget(e.target)) return

  const w = window as Window & { __surveyosLastTouchEnd?: number }
  const now = Date.now()
  const last = w.__surveyosLastTouchEnd ?? 0
  if (now - last <= DOUBLE_TAP_MS) {
    e.preventDefault()
  }
  w.__surveyosLastTouchEnd = now
}

/** Prevent iOS pinch / double-tap zoom in standalone PWA without blocking vertical scroll. */
export function initPwaZoomLock(): void {
  if (typeof window === 'undefined' || !isIosTouchDevice()) return

  const w = window as Window & { __surveyosPwaZoomLock?: boolean }
  if (w.__surveyosPwaZoomLock) return
  w.__surveyosPwaZoomLock = true

  const opts: AddEventListenerOptions = { passive: false }

  document.addEventListener('gesturestart', onGesture, opts)
  document.addEventListener('gesturechange', onGesture, opts)
  document.addEventListener('gestureend', onGesture, opts)
  document.addEventListener('touchmove', onTouchMove, opts)
  document.addEventListener('touchend', onTouchEnd, opts)
}
