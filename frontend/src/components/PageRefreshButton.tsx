import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useRefresh } from '../context/RefreshContext'

type PageRefreshButtonProps = {
  variant?: 'onDark' | 'onLight'
  className?: string
}

const variantClass: Record<NonNullable<PageRefreshButtonProps['variant']>, string> = {
  onDark:
    'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-white ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-60',
  onLight:
    'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:bg-neutral-50 disabled:opacity-60 md:h-10 md:w-10',
}

export function PageRefreshButton({ variant = 'onDark', className = '' }: PageRefreshButtonProps) {
  const { requestRefresh } = useRefresh()
  const [spinning, setSpinning] = useState(false)

  const handleClick = () => {
    requestRefresh()
    setSpinning(true)
    window.setTimeout(() => setSpinning(false), 650)
  }

  return (
    <button
      type="button"
      className={[variantClass[variant], className].filter(Boolean).join(' ')}
      aria-label="Refresh page"
      disabled={spinning}
      onClick={handleClick}
    >
      <RefreshCw size={18} strokeWidth={2} className={spinning ? 'animate-spin' : undefined} />
    </button>
  )
}
