import { useEffect, useState, type ReactNode } from 'react'
import { waitForBackendHealth } from '../api/healthCheck'
import { StartupScreen } from './StartupScreen'

type ServerWakeUpProps = {
  children: ReactNode
}

export default function ServerWakeUp({ children }: ServerWakeUpProps) {
  const [backendReady, setBackendReady] = useState(false)

  useEffect(() => {
    return waitForBackendHealth(() => setBackendReady(true))
  }, [])

  if (!backendReady) {
    return <StartupScreen />
  }

  return children
}
