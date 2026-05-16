import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react'

type RefreshHandler = () => void | Promise<void>

type RefreshContextValue = {
  refreshTick: number
  isRefreshing: boolean
  requestRefresh: () => Promise<void>
  registerRefreshHandler: (handler: RefreshHandler) => () => void
}

const RefreshContext = createContext<RefreshContextValue | null>(null)

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [refreshTick, setRefreshTick] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const handlersRef = useRef(new Set<RefreshHandler>())

  const registerRefreshHandler = useCallback((handler: RefreshHandler) => {
    handlersRef.current.add(handler)
    return () => {
      handlersRef.current.delete(handler)
    }
  }, [])

  const requestRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const handlers = [...handlersRef.current]
      if (handlers.length > 0) {
        await Promise.allSettled(handlers.map((h) => Promise.resolve(h())))
      } else {
        setRefreshTick((tick) => tick + 1)
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      refreshTick,
      isRefreshing,
      requestRefresh,
      registerRefreshHandler,
    }),
    [refreshTick, isRefreshing, requestRefresh, registerRefreshHandler],
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

/** Registers a page data loader for header refresh and re-runs it when deps change. */
export function usePageRefresh(
  load: () => void | Promise<void>,
  deps: DependencyList,
  options?: { enabled?: boolean },
) {
  const { refreshTick, registerRefreshHandler } = useRefresh()
  const enabled = options?.enabled ?? true
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    if (!enabled) return undefined
    return registerRefreshHandler(() => loadRef.current())
  }, [enabled, registerRefreshHandler, ...deps])

  useEffect(() => {
    if (!enabled) return
    void loadRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick, enabled, ...deps])
}
