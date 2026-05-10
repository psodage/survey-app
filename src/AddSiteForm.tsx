import { useMemo, useState } from 'react'

export const DEFAULT_CLIENT_OPTIONS_FOR_ADD_SITE = [
  'Amit Developers',
  'Shree Krishna Infra',
  'Vishwakarma Properties',
  'Gajanan Projects',
] as const

function parseAmount(value: string) {
  return Number(value.replace(/[^\d.-]/g, '')) || 0
}

export type AddSiteFormProps = {
  clientName: string
  variant?: 'page' | 'modal'
  onCancel: () => void
  onSuccess: () => void
}

export function AddSiteForm({ clientName, variant = 'page', onCancel, onSuccess }: AddSiteFormProps) {
  const [siteName, setSiteName] = useState('')
  const [locationName, setLocationName] = useState('')
  const [status, setStatus] = useState<'Active' | 'On Hold' | 'Completed'>('Active')
  const [pendingAmount, setPendingAmount] = useState('')
  const [totalPoints, setTotalPoints] = useState('')
  const [ratePerPoint, setRatePerPoint] = useState('')
  const [baseCharge, setBaseCharge] = useState('')
  const [extraCharges, setExtraCharges] = useState('')
  const [discount, setDiscount] = useState('')

  const calculatedTotalAmount = useMemo(() => {
    const points = parseAmount(totalPoints)
    const rate = parseAmount(ratePerPoint)
    const base = parseAmount(baseCharge)
    const extra = parseAmount(extraCharges)
    const discountValue = parseAmount(discount)
    return Math.max(0, base + points * rate + extra - discountValue)
  }, [baseCharge, discount, extraCharges, ratePerPoint, totalPoints])

  const resetFields = () => {
    setSiteName('')
    setLocationName('')
    setStatus('Active')
    setPendingAmount('')
    setTotalPoints('')
    setRatePerPoint('')
    setBaseCharge('')
    setExtraCharges('')
    setDiscount('')
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
      onSubmit={(event) => {
        event.preventDefault()
        resetFields()
        onSuccess()
      }}
    >
      <label className="grid gap-2">
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

      <label className="grid gap-2">
        <span className="text-xs font-bold text-neutral-700">Status</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as 'Active' | 'On Hold' | 'Completed')}
          className={inputClass}
        >
          <option value="Active">Active</option>
          <option value="On Hold">On Hold</option>
          <option value="Completed">Completed</option>
        </select>
      </label>

      <label className={['grid gap-2', colSpanWide].join(' ')}>
        <span className="text-xs font-bold text-neutral-700">Pending Amount (optional)</span>
        <input
          value={pendingAmount}
          onChange={(event) => setPendingAmount(event.target.value)}
          className={inputClass}
          placeholder="e.g. 25000"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold text-neutral-700">Total Points</span>
        <input
          value={totalPoints}
          onChange={(event) => setTotalPoints(event.target.value)}
          inputMode="numeric"
          className={inputClass}
          placeholder="0"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold text-neutral-700">Rate Per Point (₹)</span>
        <input
          value={ratePerPoint}
          onChange={(event) => setRatePerPoint(event.target.value)}
          inputMode="numeric"
          className={inputClass}
          placeholder="0"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold text-neutral-700">Base Charge (₹)</span>
        <input
          value={baseCharge}
          onChange={(event) => setBaseCharge(event.target.value)}
          inputMode="numeric"
          className={inputClass}
          placeholder="0"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold text-neutral-700">Extra Charges (₹)</span>
        <input
          value={extraCharges}
          onChange={(event) => setExtraCharges(event.target.value)}
          inputMode="numeric"
          className={inputClass}
          placeholder="0"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold text-neutral-700">Discount (₹)</span>
        <input
          value={discount}
          onChange={(event) => setDiscount(event.target.value)}
          inputMode="numeric"
          className={inputClass}
          placeholder="0"
        />
      </label>

      <label className={['grid gap-2', colSpanWide].join(' ')}>
        <span className="text-xs font-bold text-neutral-700">Total Amount (₹)</span>
        <input
          value={calculatedTotalAmount.toLocaleString('en-IN')}
          readOnly
          className="h-11 rounded-xl border border-[#f39b03]/30 bg-[#f39b03]/5 px-3 text-sm font-extrabold text-[#b56d00] outline-none"
        />
        <p className="text-[11px] font-semibold text-neutral-500">
          Base Charge + (Total Points × Rate Per Point) + Extra Charges - Discount
        </p>
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
          className="inline-flex h-11 min-w-[120px] flex-1 items-center justify-center rounded-xl bg-[#f39b03] px-8 text-sm font-extrabold text-white transition hover:bg-[#e18e03] sm:flex-none"
        >
          Save Site
        </button>
      </div>
    </form>
  )
}
