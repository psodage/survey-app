import { AlertTriangle, Info, X } from 'lucide-react'

export type ConfirmAlertProps = {
  open: boolean
  title: string
  description: string
  /** Optional extra line (e.g. transaction summary) */
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmBusy?: boolean
  variant?: 'danger' | 'neutral'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmAlert({
  open,
  title,
  description,
  detail,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmBusy = false,
  variant = 'neutral',
  onConfirm,
  onCancel,
}: ConfirmAlertProps) {
  if (!open) return null

  const isDanger = variant === 'danger'

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-alert-title"
      aria-describedby="confirm-alert-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={() => {
          if (!confirmBusy) onCancel()
        }}
      />
      <div className="relative z-[71] w-full max-w-md rounded-2xl bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-black/10 sm:p-5">
        <div className="flex gap-3">
          <div
            className={[
              'grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1',
              isDanger ? 'bg-rose-50 text-rose-600 ring-rose-200' : 'bg-[#f39b03]/12 text-[#c97702] ring-[#f39b03]/25',
            ].join(' ')}
            aria-hidden
          >
            {isDanger ? <AlertTriangle size={22} strokeWidth={2} /> : <Info size={22} strokeWidth={2} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 id="confirm-alert-title" className="text-base font-extrabold tracking-tight text-neutral-950 sm:text-lg">
                {title}
              </h2>
              <button
                type="button"
                disabled={confirmBusy}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close"
                onClick={onCancel}
              >
                <X size={18} />
              </button>
            </div>
            <p id="confirm-alert-desc" className="mt-2 text-sm font-semibold leading-relaxed text-neutral-600">
              {description}
            </p>
            {detail ? (
              <p className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 ring-1 ring-black/5">
                {detail}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            disabled={confirmBusy}
            onClick={onCancel}
            className="h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[6.5rem]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={confirmBusy}
            onClick={onConfirm}
            className={[
              'h-11 rounded-xl px-4 text-sm font-extrabold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[6.5rem]',
              isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#f39b03] hover:bg-[#e18e03]',
            ].join(' ')}
          >
            {confirmBusy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
