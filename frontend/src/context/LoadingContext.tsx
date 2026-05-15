import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getLoadingSnapshot, subscribeLoading } from '../api/loadingBridge'
import GlobalLoader from '../components/GlobalLoader'

type LoadingContextValue = {
  isLoading: boolean
  isProcessing: boolean
  activeRequestCount: number
  loadingMessage: string
}

const LoadingContext = createContext<LoadingContextValue | null>(null)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(getLoadingSnapshot)

  useEffect(() => subscribeLoading(setState), [])

  useEffect(() => {
    document.body.classList.toggle('api-loading-active', state.visible)
    return () => document.body.classList.remove('api-loading-active')
  }, [state.visible])

  const value = useMemo<LoadingContextValue>(
    () => ({
      isLoading: state.visible,
      isProcessing: state.visible || state.activeCount > 0,
      activeRequestCount: state.activeCount,
      loadingMessage: state.message,
    }),
    [state.activeCount, state.message, state.visible],
  )

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <GlobalLoader visible={state.visible} message={state.message} />
    </LoadingContext.Provider>
  )
}

export function useApiLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error('useApiLoading must be used within LoadingProvider')
  return ctx
}

/** Disables interactive elements while any API request is in flight. */
export function useDisableWhileLoading(disabled?: boolean): boolean {
  const { isProcessing } = useApiLoading()
  return Boolean(disabled || isProcessing)
}

export function useLoadingCallback<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const { isProcessing } = useApiLoading()

  return useCallback(
    (...args: Parameters<T>) => {
      if (isProcessing) {
        return Promise.reject(new Error('A request is already in progress.'))
      }
      return fn(...args) as Promise<Awaited<ReturnType<T>>>
    },
    [fn, isProcessing],
  ) as (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>
}
