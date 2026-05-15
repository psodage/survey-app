import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type RefreshContextValue = {
  refreshTick: number
  requestRefresh: () => void
}

const RefreshContext = createContext<RefreshContextValue | null>(null)

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [refreshTick, setRefreshTick] = useState(0)

  const requestRefresh = useCallback(() => {
    setRefreshTick((tick) => tick + 1)
  }, [])

  const value = useMemo(
    () => ({
      refreshTick,
      requestRefresh,
    }),
    [refreshTick, requestRefresh],
  )

  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
}

export function useRefresh() {
  const ctx = useContext(RefreshContext)
  if (!ctx) {
    throw new Error('useRefresh must be used within RefreshProvider')
  }
  return ctx
}
