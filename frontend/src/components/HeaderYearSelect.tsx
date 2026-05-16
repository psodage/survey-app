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
      ? 'inline-flex h-9 min-w-[6.25rem] cursor-pointer items-center gap-1 rounded-xl border border-white/20 bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-neutral-800'
      : 'inline-flex h-9 min-w-[6.25rem] cursor-pointer items-center gap-1 rounded-xl border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:bg-neutral-50'
    : isDark
      ? 'inline-flex h-9 min-w-[6.5rem] cursor-pointer items-center gap-1.5 rounded-xl border border-white/20 bg-neutral-900 px-2.5 py-0.5 text-xs font-semibold text-white transition hover:bg-neutral-800 sm:text-sm'
      : 'inline-flex h-9 min-w-[6.5rem] cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2.5 py-2 text-xs font-semibold text-neutral-900 shadow-sm ring-1 ring-black/5 transition hover:bg-neutral-50 sm:py-2.5 sm:text-sm'

  const iconSize = compact ? 13 : 16

  const innerSelectClass = [
    'h-9 min-h-0 w-[4rem] min-w-[4rem] max-w-none rounded-md border-0 bg-transparent px-0 py-0 text-left text-[11px] font-extrabold tabular-nums outline-none shadow-none ring-0 sm:w-[4.25rem] sm:min-w-[4.25rem]',
    isDark ? 'text-white' : 'text-neutral-950',
  ].join(' ')

  return (
    <label className={wrapClass}>
      <Calendar size={iconSize} className="shrink-0 text-[#f39b03]" aria-hidden />
      <span className="sr-only">Record year</span>
      <div className="relative w-[4rem] shrink-0 sm:w-[4.25rem]">
        <AppSelect
          value={selectedYear}
          onChange={setSelectedYear}
          className={innerSelectClass}
          triggerButtonClassName="!pr-7"
          chevronPositionClass="right-1.5"
          aria-label="Record year"
          searchableThreshold={99}
          options={years.map((y) => ({ value: y, label: y }))}
        />
      </div>
    </label>
  )
}
