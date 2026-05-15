import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { beginTrackedRequest, endTrackedRequest } from './loadingBridge'
import { withDedup } from './dedup'

const TOKEN_KEY = 'survey_access_token'
const INSTRUMENT_KEY = 'survey_instrument_id'

const RETRY_BASE_MS = 3000
/** Extra attempts for Render cold start / transient 502 (browser shows as CORS when gateway has no headers). */
const MAX_RETRIES = 2

export const tokenStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string | null) => {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  },
  getInstrumentId: () => localStorage.getItem(INSTRUMENT_KEY),
  setInstrumentId: (id: string | null) => {
    if (id) localStorage.setItem(INSTRUMENT_KEY, id)
    else localStorage.removeItem(INSTRUMENT_KEY)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(INSTRUMENT_KEY)
  },
}

const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''

const http = axios.create({
  baseURL: apiBase.replace(/\/$/, ''),
  headers: { 'Content-Type': 'application/json' },
})

const coreRequest = http.request.bind(http)

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Global overlay only for writes (save/delete) unless explicitly opted in. */
export function shouldShowGlobalLoading(config: InternalAxiosRequestConfig): boolean {
  if (config.skipGlobalLoading) return false
  if (config.showGlobalLoading === true) return true
  if (config.showGlobalLoading === false) return false
  const method = (config.method ?? 'get').toUpperCase()
  return MUTATION_METHODS.has(method)
}

function trackLoadingStart(config: InternalAxiosRequestConfig) {
  if (!shouldShowGlobalLoading(config) || config._dedupJoined) return
  if (!config._loadingSlotId) {
    config._loadingSlotId = beginTrackedRequest(config)
  }
}

function trackLoadingEnd(config?: InternalAxiosRequestConfig) {
  if (!config?.skipGlobalLoading && config?._loadingSlotId) {
    endTrackedRequest(config._loadingSlotId)
    config._loadingSlotId = undefined
  }
}

function isRetryableError(err: AxiosError): boolean {
  if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || !err.response) return true
  const status = err.response.status
  return status === 502 || status === 503 || status === 504
}

function handleAuthError(err: AxiosError) {
  const status = err.response?.status
  const url = String(err.config?.url ?? '')
  if (status === 400) {
    const msg = String((err.response?.data as { error?: string } | undefined)?.error ?? '')
    if (/invalid instrument id/i.test(msg)) {
      tokenStorage.setInstrumentId(null)
    }
  }
  const publicAuthPaths = ['/auth/login', '/auth/forgot-password', '/auth/verify-reset-otp', '/auth/reset-password']
  if (status === 401 && !publicAuthPaths.some((p) => url.includes(p))) {
    tokenStorage.clear()
    window.dispatchEvent(new CustomEvent('survey:unauthorized'))
  }
}

http.interceptors.request.use((config) => {
  const t = tokenStorage.getToken()
  if (t) config.headers.Authorization = `Bearer ${t}`
  const i = tokenStorage.getInstrumentId()
  if (i) config.headers['x-instrument-id'] = i
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  trackLoadingStart(config)
  return config
})

http.interceptors.response.use(
  (res) => {
    trackLoadingEnd(res.config)
    return res
  },
  async (err: AxiosError) => {
    const config = err.config as InternalAxiosRequestConfig | undefined

    if (config && !config.skipRetry && isRetryableError(err)) {
      const retries = config._retryCount ?? 0
      if (retries < MAX_RETRIES) {
        config._retryCount = retries + 1
        await sleep(RETRY_BASE_MS * (retries + 1))
        try {
          return await coreRequest(config)
        } catch (retryErr) {
          handleAuthError(retryErr as AxiosError)
          return Promise.reject(retryErr)
        }
      }
    }

    trackLoadingEnd(config)
    handleAuthError(err)
    return Promise.reject(err)
  },
)

http.request = function request<T = unknown, R = AxiosResponse<T>>(
  config: InternalAxiosRequestConfig,
): Promise<R> {
  return withDedup(config, () => coreRequest<T, R>(config))
}

export default http
