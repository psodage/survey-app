import type { AxiosRequestConfig, AxiosResponse } from 'axios'

const inflight = new Map<string, Promise<AxiosResponse<unknown>>>()

function stableSerialize(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (value instanceof FormData) return '__formdata__'
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function getRequestDedupKey(config: AxiosRequestConfig): string {
  const method = (config.method ?? 'get').toUpperCase()
  const url = config.url ?? ''
  const params = stableSerialize(config.params)
  const data = stableSerialize(config.data)
  return `${method}:${url}:${params}:${data}`
}

export function withDedup<T>(
  config: AxiosRequestConfig,
  execute: () => Promise<AxiosResponse<T>>,
): Promise<AxiosResponse<T>> {
  if (config.skipDedup || config.data instanceof FormData) {
    return execute()
  }

  const key = getRequestDedupKey(config)
  const existing = inflight.get(key) as Promise<AxiosResponse<T>> | undefined
  if (existing) {
    config._dedupJoined = true
    return existing
  }

  const promise = execute().finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key)
  })

  inflight.set(key, promise as Promise<AxiosResponse<unknown>>)
  return promise
}
