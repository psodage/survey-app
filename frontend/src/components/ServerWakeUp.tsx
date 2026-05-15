import { useEffect, useState, type ReactNode } from 'react'
import { waitForBackendHealth } from '../api/healthCheck'

function ServerWakeUpScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-[100svh] flex-col items-center justify-center bg-neutral-950 px-6 text-center text-white"
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className="mb-6 h-10 w-10 animate-spin rounded-full border-2 border-[#f39b03]/30 border-t-[#f39b03]"
        aria-hidden
      />
      <p className="text-lg font-semibold tracking-tight">Starting server...</p>
      <p className="mt-2 max-w-sm text-sm text-neutral-400">This may take a few seconds.</p>
    </div>
  )
}

type ServerWakeUpProps = {
  children: ReactNode
}

export default function ServerWakeUp({ children }: ServerWakeUpProps) {
  const [backendReady, setBackendReady] = useState(false)

  useEffect(() => {
    return waitForBackendHealth(() => setBackendReady(true))
  }, [])

  if (!backendReady) {
    return <ServerWakeUpScreen />
  }

  return children
}
