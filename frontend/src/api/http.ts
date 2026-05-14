import axios from 'axios'

const TOKEN_KEY = 'survey_access_token'
const INSTRUMENT_KEY = 'survey_instrument_id'

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

const apiBase =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || ''

const http = axios.create({
  baseURL: apiBase.replace(/\/$/, ''),
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const t = tokenStorage.getToken()
  if (t) config.headers.Authorization = `Bearer ${t}`
  const i = tokenStorage.getInstrumentId()
  if (i) config.headers['x-instrument-id'] = i
  // Let the browser set multipart boundary (default axios/json would break multer uploads).
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
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
    return Promise.reject(err)
  },
)

export default http
