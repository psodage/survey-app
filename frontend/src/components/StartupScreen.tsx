type StartupScreenProps = {
  title?: string
  subtitle?: string
}

/** Full-screen bootstrap UI (server wake + session load). Matches app dark shell — not a white flash. */
export function StartupScreen({
  title = 'Starting server...',
  subtitle = 'This may take a few seconds.',
}: StartupScreenProps) {
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
      <p className="text-lg font-semibold tracking-tight">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-neutral-400">{subtitle}</p>
    </div>
  )
}
