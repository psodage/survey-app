import type { ReactNode } from 'react'

/** Outer shell: radius, ring, shadow (no background — add bg-* as needed) */
export const surfaceCardClass =
  'rounded-xl shadow-sm ring-1 ring-black/5 md:rounded-2xl md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]'

/** CardPanel toolbar search — compact on mobile, standard from md */
export const toolbarSearchInputClass =
  'h-8 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20 md:h-10 md:rounded-lg md:px-3 md:text-sm'

/** Filters, Export, and other outline toolbar actions */
export const toolbarSecondaryButtonClass =
  'inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-bold text-neutral-700 transition hover:bg-neutral-50 md:h-10 md:rounded-lg md:px-3 md:text-sm'

/** Primary toolbar CTA (e.g. Add …) */
export const toolbarPrimaryButtonClass =
  'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#f39b03] px-3 text-xs font-extrabold text-white shadow-[0_6px_16px_rgba(16,24,40,0.1)] transition hover:bg-[#e18e03] md:h-10 md:gap-2 md:rounded-lg md:px-4 md:text-sm md:shadow-[0_8px_24px_rgba(16,24,40,0.12)]'

/** Lucide Plus in toolbar primary buttons */
export const toolbarPlusIconClass = 'h-3.5 w-3.5 shrink-0 md:h-4 md:w-4'

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  toneClass,
  mobileCardTint,
}: {
  title: string
  value: string
  subtitle?: string
  icon: ReactNode
  toneClass: string
  /** Full-card soft tint on mobile only (md+ uses white card) */
  mobileCardTint: string
}) {
  return (
    <div
      className={[
        'w-full min-h-[70px] rounded-xl p-2 shadow-sm ring-1 ring-black/5 md:min-h-[126px]',
        mobileCardTint,
        'md:rounded-2xl md:bg-white md:p-5 md:shadow-[0_10px_30px_rgba(16,24,40,0.06)]',
      ].join(' ')}
    >
      <div className="flex items-start gap-1.5 md:gap-4">
        <div
          className={[
            'grid h-7 w-7 shrink-0 place-items-center rounded-lg md:h-12 md:w-12 md:rounded-2xl',
            toneClass,
          ].join(' ')}
        >
          <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 md:scale-100 md:[&>svg]:h-5 md:[&>svg]:w-5">
            {icon}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold leading-tight text-neutral-700 md:text-sm">{title}</div>
          <div className="mt-0.5 text-base font-extrabold leading-tight tracking-tight text-neutral-950 md:mt-1 md:text-2xl">
            {value}
          </div>
          {subtitle ? (
            <div className="mt-0.5 text-[10px] font-medium leading-snug text-neutral-500 md:mt-1 md:text-xs">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function CardShell({
  title,
  action,
  leadingIcon,
  headerEnd,
  className,
  bodyClassName = 'p-2 sm:p-2.5 md:p-6',
  children,
}: {
  title: string
  action?: ReactNode
  leadingIcon?: ReactNode
  headerEnd?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  return (
    <div
      className={['bg-white', surfaceCardClass, className ?? ''].filter(Boolean).join(' ')}
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2 sm:px-6 sm:py-2.5 md:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-2.5">
          {leadingIcon ? (
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#f39b03]/12 text-[#f39b03] ring-1 ring-[#f39b03]/20 md:h-9 md:w-9 md:rounded-xl">
              {leadingIcon}
            </span>
          ) : null}
          <div className="min-w-0 truncate text-xs font-extrabold tracking-tight text-neutral-900 md:text-sm">
            {title}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {headerEnd ? <div className="min-w-0 shrink-0">{headerEnd}</div> : null}
          {action ? (
            <div className="text-[11px] font-semibold text-[#f39b03] hover:opacity-90 md:text-xs">
              {action}
            </div>
          ) : null}
        </div>
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}

/** White elevated surface with Dashboard-style radius and shadow; add padding via className. */
export function CardPanel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={['bg-white', surfaceCardClass, className ?? ''].filter(Boolean).join(' ')}>{children}</div>
}
