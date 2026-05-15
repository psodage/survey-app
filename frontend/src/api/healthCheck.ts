const HEALTH_RETRY_MS = 3000

export function getApiOrigin(): string {
  const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''
  return base.replace(/\/$/, '')
}

export function getHealthCheckUrl(): string {
  const origin = getApiOrigin()
  return origin ? `${origin}/health` : '/health'
}

export async function pingBackendHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(getHealthCheckUrl(), {
      method: 'GET',
      credentials: 'omit',
      signal,
    })
    if (!res.ok) return false
    const data = (await res.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

export function waitForBackendHealth(onReady: () => void): () => void {
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const attempt = async () => {
    if (cancelled) return
    const ok = await pingBackendHealth()
    if (cancelled) return
    if (ok) {
      onReady()
      return
    }
    timer = setTimeout(attempt, HEALTH_RETRY_MS)
  }

  void attempt()

  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }
}
