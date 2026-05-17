const KEYBOARD_OPEN_THRESHOLD_PX = 72

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isFocusableField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true
  }
  return target.isContentEditable
}

function applyViewportMetrics() {
  const vv = window.visualViewport
  if (!vv) return

  const layoutH = window.innerHeight
  const visibleH = vv.height
  const keyboardOpen = isMobileViewport() && layoutH - visibleH > KEYBOARD_OPEN_THRESHOLD_PX

  document.documentElement.style.setProperty('--app-vh', `${Math.round(visibleH)}px`)
  document.documentElement.style.setProperty('--app-vv-top', `${Math.round(vv.offsetTop)}px`)
  document.body.classList.toggle('keyboard-open', keyboardOpen)
}

function scrollFocusedFieldIntoView(target: EventTarget | null) {
  if (!isMobileViewport() || !isFocusableField(target)) return
  const el = target
  window.setTimeout(() => {
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  }, 320)
}

/**
 * iOS PWA: sync layout height to the visual viewport when the keyboard opens so the page
 * does not leave a black gap above the bottom nav, and hide the nav while typing.
 */
export function initIosKeyboardViewport() {
  if (typeof window === 'undefined') return

  const w = window as Window & { __surveyosIosKeyboardViewport?: boolean }
  if (w.__surveyosIosKeyboardViewport) return
  w.__surveyosIosKeyboardViewport = true

  applyViewportMetrics()

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyViewportMetrics)
    window.visualViewport.addEventListener('scroll', applyViewportMetrics)
  }
  window.addEventListener('resize', applyViewportMetrics)
  window.addEventListener('orientationchange', () => {
    window.setTimeout(applyViewportMetrics, 100)
  })

  if (isIosLike()) {
    document.addEventListener(
      'focusin',
      (e) => {
        applyViewportMetrics()
        scrollFocusedFieldIntoView(e.target)
      },
      true,
    )
    document.addEventListener(
      'focusout',
      () => {
        window.setTimeout(applyViewportMetrics, 120)
      },
      true,
    )
  }
}
