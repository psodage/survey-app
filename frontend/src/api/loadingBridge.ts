import type { InternalAxiosRequestConfig } from 'axios'

export type LoadingMessageKey = 'loading' | 'saving' | 'processing' | 'syncing'

const MESSAGE_BY_KEY: Record<LoadingMessageKey, string> = {
  loading: 'Loading data...',
  saving: 'Saving changes...',
  processing: 'Processing request...',
  syncing: 'Syncing with server...',
}

export const MIN_LOADING_MS = 5000

export type LoadingBridgeListener = (state: {
  activeCount: number
  visible: boolean
  message: string
}) => void

type RequestSlot = {
  config: InternalAxiosRequestConfig
  startedAt: number
}

let activeCount = 0
let visible = false
let message = MESSAGE_BY_KEY.loading
let overlayShownAt: number | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
const slots = new Map<symbol, RequestSlot>()
const listeners = new Set<LoadingBridgeListener>()

function emit() {
  const snapshot = { activeCount, visible, message }
  listeners.forEach((fn) => fn(snapshot))
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function scheduleHide() {
  clearHideTimer()
  if (activeCount > 0) return

  const elapsed = overlayShownAt != null ? Date.now() - overlayShownAt : MIN_LOADING_MS
  const remaining = Math.max(0, MIN_LOADING_MS - elapsed)

  hideTimer = setTimeout(() => {
    hideTimer = null
    if (activeCount > 0) return
    visible = false
    overlayShownAt = null
    emit()
  }, remaining)
}

export function resolveLoadingMessage(config: InternalAxiosRequestConfig): string {
  const custom = config.loadingMessage
  if (typeof custom === 'string' && custom.trim()) return custom.trim()

  const method = (config.method ?? 'get').toUpperCase()
  if (method === 'GET') return MESSAGE_BY_KEY.loading
  if (method === 'POST') return MESSAGE_BY_KEY.saving
  if (method === 'PUT' || method === 'PATCH') return MESSAGE_BY_KEY.saving
  if (method === 'DELETE') return MESSAGE_BY_KEY.processing
  return MESSAGE_BY_KEY.syncing
}

export function subscribeLoading(listener: LoadingBridgeListener): () => void {
  listeners.add(listener)
  listener({ activeCount, visible, message })
  return () => listeners.delete(listener)
}

export function beginTrackedRequest(config: InternalAxiosRequestConfig): symbol {
  const slotId = Symbol('api-request')
  const msg = resolveLoadingMessage(config)

  slots.set(slotId, { config, startedAt: Date.now() })
  activeCount += 1
  message = msg

  if (!visible) {
    visible = true
    overlayShownAt = Date.now()
  }

  clearHideTimer()
  emit()
  return slotId
}

export function endTrackedRequest(slotId: symbol) {
  if (!slots.has(slotId)) return
  slots.delete(slotId)
  activeCount = Math.max(0, activeCount - 1)

  if (activeCount === 0) {
    scheduleHide()
  } else {
    const latest = [...slots.values()].at(-1)
    if (latest) message = resolveLoadingMessage(latest.config)
    emit()
  }
}

export function getLoadingSnapshot() {
  return { activeCount, visible, message }
}
