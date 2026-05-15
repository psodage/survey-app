import { ChevronDown, Search } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

export type AppSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type AppSelectProps = {
  value: string
  onChange: (value: string) => void
  options: AppSelectOption[]
  placeholder?: string
  className?: string
  /** Show search when options length exceeds this (default 8). */
  searchableThreshold?: number
  disabled?: boolean
  'aria-label'?: string
  id?: string
}

export function AppSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className = '',
  searchableThreshold = 8,
  disabled = false,
  'aria-label': ariaLabel,
  id: idProp,
}: AppSelectProps) {
  const autoId = useId()
  const triggerId = idProp ?? `app-select-${autoId}`
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const searchable = options.length >= searchableThreshold

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const enabledIndices = useMemo(
    () => filtered.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0),
    [filtered],
  )

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [open, close])

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus()
  }, [open, searchable])

  useEffect(() => {
    if (!open) return
    const idx = enabledIndices.findIndex((i) => filtered[i]?.value === value)
    setHighlight(idx >= 0 ? idx : 0)
  }, [open, filtered, value, enabledIndices])

  const pick = (next: string) => {
    onChange(next)
    close()
  }

  const moveHighlight = (dir: 1 | -1) => {
    if (enabledIndices.length === 0) return
    setHighlight((prev) => {
      const cur = enabledIndices.indexOf(enabledIndices[prev] ?? enabledIndices[0])
      const base = cur >= 0 ? cur : 0
      return (base + dir + enabledIndices.length) % enabledIndices.length
    })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) setOpen(true)
        else moveHighlight(1)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) setOpen(true)
        else moveHighlight(-1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!open) setOpen(true)
        else {
          const opt = filtered[enabledIndices[highlight]]
          if (opt && !opt.disabled) pick(opt.value)
        }
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
      case 'Tab':
        close()
        break
      default:
        break
    }
  }

  return (
    <SelectRoot ref={rootRef} className={className}>
      <button
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return
          setOpen((v) => !v)
        }}
        onKeyDown={onKeyDown}
        className={[
          'relative flex h-full w-full min-w-0 items-center justify-between gap-2 rounded-[inherit] border-0 bg-transparent px-[inherit] py-[inherit] text-left font-[inherit] text-[inherit] outline-none',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className={selected ? 'truncate' : 'truncate text-neutral-400'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={['shrink-0 text-neutral-500 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
          aria-hidden
        />
      </button>

      <div
        role="listbox"
        aria-labelledby={triggerId}
        className={[
          'absolute left-0 right-0 z-[80] mt-1.5 origin-top overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_12px_40px_rgba(16,24,40,0.14)] ring-1 ring-black/5 transition duration-200 ease-out',
          open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-[0.98] opacity-0',
        ].join(' ')}
        style={{ top: '100%' }}
      >
        {searchable ? (
          <div className="border-b border-neutral-100 p-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search…"
                className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-8 pr-2 text-xs font-semibold text-neutral-900 outline-none focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20"
                aria-label="Search options"
              />
            </div>
          </div>
        ) : null}
        <ul className="max-h-[min(16rem,50vh)] overflow-y-auto overscroll-contain py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-xs font-semibold text-neutral-500">No matches</li>
          ) : (
            filtered.map((opt, i) => {
              const enabledIdx = enabledIndices.indexOf(i)
              const isHighlighted = enabledIdx === highlight
              return (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    disabled={opt.disabled}
                    onMouseEnter={() => {
                      if (enabledIdx >= 0) setHighlight(enabledIdx)
                    }}
                    onClick={() => {
                      if (!opt.disabled) pick(opt.value)
                    }}
                    className={[
                      'flex w-full items-center px-3 py-2.5 text-left text-xs font-bold transition sm:text-sm',
                      opt.disabled ? 'cursor-not-allowed text-neutral-300' : 'text-neutral-800 hover:bg-neutral-50',
                      opt.value === value ? 'bg-[#f39b03]/10 text-[#b87402]' : '',
                      isHighlighted && !opt.disabled ? 'bg-neutral-100' : '',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </SelectRoot>
  )
}

function SelectRoot({
  className = '',
  children,
  ref,
}: {
  className?: string
  children: React.ReactNode
  ref?: React.Ref<HTMLDivElement>
}) {
  return (
    <div ref={ref} className={['relative', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
