import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import http from './http'

export { getRequestDedupKey } from './dedup'

/** Centralized API entry — uses shared axios client with loading, retry, and dedup. */
export function apiRequest<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return http.request<T>(config)
}

export function apiGet<T = unknown>(url: string, config?: AxiosRequestConfig) {
  return apiRequest<T>({ ...config, method: 'GET', url })
}

export function apiPost<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
  return apiRequest<T>({ ...config, method: 'POST', url, data })
}

export function apiPut<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
  return apiRequest<T>({ ...config, method: 'PUT', url, data })
}

export function apiPatch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) {
  return apiRequest<T>({ ...config, method: 'PATCH', url, data })
}

export function apiDelete<T = unknown>(url: string, config?: AxiosRequestConfig) {
  return apiRequest<T>({ ...config, method: 'DELETE', url })
}

/** Read `error` field from axios API error payloads for toast messages. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { error?: string } } }).response?.data
    if (data?.error) return data.error
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
