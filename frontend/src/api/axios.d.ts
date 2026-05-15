import 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Skip global overlay and loading counter for this request. */
    skipGlobalLoading?: boolean
    /** Force or suppress the global overlay (default: mutations only). */
    showGlobalLoading?: boolean
    /** Custom text shown on the global loader overlay. */
    loadingMessage?: string
    /** Do not auto-retry on network / gateway errors. */
    skipRetry?: boolean
    /** Allow duplicate in-flight requests with the same key. */
    skipDedup?: boolean
    /** @internal Tracks loading slot for this logical request. */
    _loadingSlotId?: symbol
    /** @internal Retry count for cold-start recovery. */
    _retryCount?: number
    /** @internal Joined an existing in-flight deduplicated request. */
    _dedupJoined?: boolean
  }

  export interface InternalAxiosRequestConfig {
    skipGlobalLoading?: boolean
    showGlobalLoading?: boolean
    loadingMessage?: string
    skipRetry?: boolean
    skipDedup?: boolean
    _loadingSlotId?: symbol
    _retryCount?: number
    _dedupJoined?: boolean
  }
}
