import { type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { StartupScreen } from './StartupScreen'

/** Keeps bootstrap UI visible until session check finishes (avoids white AuthLoading flash). */
export function AuthReadyGate({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <StartupScreen />
  }

  return children
}
