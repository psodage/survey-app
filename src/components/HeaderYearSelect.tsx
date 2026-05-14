import { Calendar, ChevronDown } from 'lucide-react'
import { useMemo } from 'react'
import { useSelectedYear } from '../context/SelectedYearContext'
import { recordYearOptions } from '../recordYearConfig'

type HeaderYearSelectProps = {
  /** Dark bar (mobile app header on md-) */
  variant?: 'onDark' | 'onLight'
  /** Tighter padding / text for mobile sub-row */
  compact?: boolean
}

export function HeaderYearSelect({ variant = 'onLight', compact = false }: HeaderYearSelectProps) {
  const { selectedYear, setSelectedYear } = useSelectedYear()
  const years = useMemo(() => recordYearOptions(), [])

  const isDark = variant === 'onDark'
  const wrapClass = compact
    ? isDark
      ? 'inline-flex h-9 min-w-[5.75rem] max-w-none cursor-pointer items-center gap-1.5 rounded-xl border border-white/20 bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-neutral-800'
      : 'inline-flex h-9 min-w-[5.75rem] max-w-none cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:bg-neutral-50'
    : isDark
      ? 'inline-flex h-9 min-w-[6rem] max-w-none cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-neutral-900 px-2.5 py-0.5 text-[11px] font-semibold text-white transition hover:bg-neutral-800 sm:px-3 sm:text-sm'
      : 'inline-flex h-9 min-w-[6rem] max-w-none cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2.5 py-2 text-xs font-semibold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:bg-neutral-50 sm:px-3 sm:py-2.5 sm:text-sm'

  const iconSize = compact ? 13 : 16

  const selectClass = [
    'w-full min-w-[3.25rem] cursor-pointer appearance-none rounded-md py-0.5 pl-1.5 pr-8 text-left text-[12px] font-extrabold tabular-nums outline-none',
    isDark
      ? 'border border-white/15 bg-neutral-950 text-white [color-scheme:dark]'
      : 'border border-neutral-200 bg-neutral-50 text-neutral-950 [color-scheme:light]',
  ].join(' ')

  return (
    <label className={wrapClass}>
      <Calendar size={iconSize} className="shrink-0 text-[#f39b03]" aria-hidden />
      <span className="sr-only">Record year</span>
      <div className="relative min-w-[3.25rem] flex-1">
        <select
          className={selectClass}
          value={selectedYear}
          aria-label="Record year"
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y} className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
              {y}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className={`pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/80' : 'text-neutral-600'}`}
          aria-hidden
        />
      </div>
    </label>
  )
}
