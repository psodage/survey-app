type TablePaginationProps = {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  className?: string
}

function pageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set<number>([1, total, current, current - 1, current + 1])
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
}

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  className = '',
}: TablePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  if (totalItems <= pageSize) return null

  const safePage = Math.min(Math.max(1, page), pageCount)
  const start = (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, totalItems)
  const pages = pageNumbers(safePage, pageCount)

  const activeClass = 'grid h-9 w-9 place-items-center rounded-xl bg-[#f39b03] text-sm font-extrabold text-white'
  const inactiveClass =
    'grid h-9 w-9 place-items-center rounded-xl border border-neutral-200 bg-white text-sm font-extrabold text-neutral-800 transition hover:bg-neutral-50'

  return (
    <div
      className={[
        'sticky bottom-0 z-[1] flex flex-col gap-3 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6 md:flex-row md:items-center md:justify-between md:py-4',
        className,
      ].join(' ')}
    >
      <div className="text-center text-sm font-semibold text-neutral-600 md:text-left">
        Showing {start} to {end} of {totalItems}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 text-sm font-extrabold text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        {pages.map((p, idx) => {
          const prev = pages[idx - 1]
          const gap = prev != null && p - prev > 1
          return (
            <span key={p} className="flex items-center gap-2">
              {gap ? <span className="px-0.5 text-sm font-bold text-neutral-400">…</span> : null}
              <button
                type="button"
                aria-label={`Page ${p}`}
                aria-current={p === safePage ? 'page' : undefined}
                onClick={() => onPageChange(p)}
                className={p === safePage ? activeClass : inactiveClass}
              >
                {p}
              </button>
            </span>
          )
        })}
        <button
          type="button"
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
