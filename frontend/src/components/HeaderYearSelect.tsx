import { Calendar } from 'lucide-react'
import { useMemo } from 'react'
import { useSelectedYear } from '../context/SelectedYearContext'
import { recordYearOptions } from '../recordYearConfig'
import { AppSelect } from './AppSelect'

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

  const innerSelectClass = [
    'w-full min-w-[3.25rem] rounded-md py-0.5 pl-1.5 pr-8 text-left text-[12px] font-extrabold tabular-nums outline-none',
    isDark
      ? 'border border-white/15 bg-neutral-950 text-white'
      : 'border border-neutral-200 bg-neutral-50 text-neutral-950',
  ].join(' ')

  return (
    <label className={wrapClass}>
      <Calendar size={iconSize} className="shrink-0 text-[#f39b03]" aria-hidden />
      <span className="sr-only">Record year</span>
      <div className="relative min-w-[3.25rem] flex-1">
        <AppSelect
          value={selectedYear}
          onChange={setSelectedYear}
          className={innerSelectClass}
          aria-label="Record year"
          searchableThreshold={99}
          options={years.map((y) => ({ value: y, label: y }))}
        />
      </div>
    </label>
  )
}
