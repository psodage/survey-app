import { useState } from 'react'

export const DEFAULT_CLIENT_OPTIONS_FOR_ADD_SITE = [
  'Amit Developers',
  'Shree Krishna Infra',
  'Vishwakarma Properties',
  'Gajanan Projects',
] as const

export type AddSiteFormProps = {
  clientName: string
  variant?: 'page' | 'modal'
  onCancel: () => void
  onSuccess: () => void
  /** When set, called before onSuccess; throw or reject to keep the form open. */
  saveSite?: (siteName: string, locationName: string) => Promise<void>
}

export function AddSiteForm({
  clientName,
  variant = 'page',
  onCancel,
  onSuccess,
  saveSite,
}: AddSiteFormProps) {
  const [siteName, setSiteName] = useState('')
  const [locationName, setLocationName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const resetFields = () => {
    setSiteName('')
    setLocationName('')
  }

  const gridClass =
    variant === 'modal'
      ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4'
      : 'grid grid-cols-1 gap-4 md:grid-cols-2'

  const inputClass =
    'h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20'

  const colSpanWide = variant === 'modal' ? 'sm:col-span-2' : 'md:col-span-2'

  return (
    <form
      className={gridClass}
      onSubmit={async (event) => {
        event.preventDefault()
        if (isSaving) return
        setIsSaving(true)
        try {
          if (saveSite) {
            await saveSite(siteName.trim(), locationName.trim())
          }
          resetFields()
          onSuccess()
        } finally {
          setIsSaving(false)
        }
      }}
    >
      <label className={['grid gap-2', colSpanWide].join(' ')}>
        <span className="text-xs font-bold text-neutral-700">Client</span>
        <input
          value={clientName}
          readOnly
          className="h-11 rounded-xl border border-neutral-200 bg-neutral-100 px-3 text-sm font-semibold text-neutral-900 outline-none"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold text-neutral-700">Site Name</span>
        <input
          value={siteName}
          onChange={(event) => setSiteName(event.target.value)}
          required
          className={inputClass}
          placeholder="e.g. Sai Residency Phase 3"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold text-neutral-700">Location</span>
        <input
          value={locationName}
          onChange={(event) => setLocationName(event.target.value)}
          required
          className={inputClass}
          placeholder="e.g. Baner"
        />
      </label>

      <div className={['mt-2 flex flex-wrap items-center gap-3', colSpanWide].join(' ')}>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 min-w-[120px] flex-1 items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 text-sm font-extrabold text-neutral-800 transition hover:bg-neutral-50 sm:flex-none"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-11 min-w-[120px] flex-1 items-center justify-center rounded-xl bg-[#f39b03] px-8 text-sm font-extrabold text-white transition hover:bg-[#e18e03] enabled:cursor-pointer disabled:opacity-60 sm:flex-none"
        >
          {isSaving ? 'Saving…' : 'Save Site'}
        </button>
      </div>
    </form>
  )
}
