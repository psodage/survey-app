/** Lightweight shell shown while lazy route chunks load. */
export function RouteFallback() {
  return (
    <div
      className="flex min-h-[100svh] items-center justify-center bg-black md:bg-neutral-100"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-600 border-t-white md:border-neutral-300 md:border-t-neutral-800" />
    </div>
  )
}
