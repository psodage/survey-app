import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import http from '../api/http'
import { AppSelect } from './AppSelect'
import type { InvoicePdfBillingLine } from '../exportInvoicePdf'
import { validateSiteVisitForm } from '../utils/validateSiteVisit'

type BillingLineDraft = { id: string; particular: string; quantity: string; rate: string; amount: string }

function newBillingLineId() {
  return `bl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function billingLinesToDraft(lines?: InvoicePdfBillingLine[]): BillingLineDraft[] {
  if (!lines?.length) {
    return [{ id: newBillingLineId(), particular: '', quantity: '1', rate: '80', amount: '' }]
  }
  return lines.map((row) => ({
    id: newBillingLineId(),
    particular: row.particular ?? '',
    quantity: row.quantity != null ? String(row.quantity) : '',
    rate: row.rate != null ? String(row.rate) : '',
    amount: row.amount != null ? String(row.amount) : '',
  }))
}

export type EditSiteVisitInitial = {
  visitMongoId: string
  visitId: string
  date: string
  engineerName?: string
  dwgNo?: string
  machine?: string
  notes?: string
  paymentMode?: string
  paymentStatus?: string
  billingLines?: InvoicePdfBillingLine[]
  billingOtherCharges?: number
}

type EditSiteVisitModalProps = {
  open: boolean
  initial: EditSiteVisitInitial | null
  onClose: () => void
  onSaved: () => void
}

function parseVisitDateForInput(displayDate: string) {
  const d = new Date(displayDate)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  const parts = displayDate.trim().split(/[\s,/-]+/)
  if (parts.length >= 3) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    }
    const day = parts[0].padStart(2, '0')
    const mon = months[parts[1].slice(0, 3).toLowerCase()] ?? '01'
    const year = parts[2].length === 4 ? parts[2] : `20${parts[2]}`
    return `${year}-${mon}-${day}`
  }
  return new Date().toISOString().slice(0, 10)
}

const fieldClass =
  'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20'

export function EditSiteVisitModal({ open, initial, onClose, onSaved }: EditSiteVisitModalProps) {
  const [visitDate, setVisitDate] = useState('')
  const [engineerName, setEngineerName] = useState('')
  const [dwgNo, setDwgNo] = useState('')
  const [machine, setMachine] = useState('Total Station')
  const [notes, setNotes] = useState('')
  const [paymentMode, setPaymentMode] = useState('—')
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [billingLines, setBillingLines] = useState<BillingLineDraft[]>(() => billingLinesToDraft())
  const [billingOtherCharges, setBillingOtherCharges] = useState('0')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !initial) return
    setVisitDate(parseVisitDateForInput(initial.date))
    setEngineerName(initial.engineerName ?? '')
    setDwgNo(initial.dwgNo ?? '')
    setMachine(initial.machine ?? 'Total Station')
    setNotes(initial.notes ?? '')
    setPaymentMode(initial.paymentMode ?? '—')
    const status = (initial.paymentStatus ?? 'pending').toLowerCase()
    setPaymentStatus(status === 'paid' || status === 'partial' || status === 'waived' ? status : 'pending')
    setBillingLines(billingLinesToDraft(initial.billingLines))
    setBillingOtherCharges(String(initial.billingOtherCharges ?? 0))
  }, [open, initial])

  const amountRupees = useMemo(() => {
    const lineSum = billingLines.reduce((sum, line) => {
      const q = parseFloat(line.quantity.replace(/[^\d.-]/g, '')) || 0
      const r = parseFloat(line.rate.replace(/[^\d.-]/g, '')) || 0
      if (q !== 0 && r !== 0) return sum + q * r
      return sum + (parseFloat(line.amount.replace(/[^\d.-]/g, '')) || 0)
    }, 0)
    return Math.round(lineSum + (parseFloat(billingOtherCharges.replace(/[^\d.-]/g, '')) || 0))
  }, [billingLines, billingOtherCharges])

  if (!open || !initial) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    const validationError = validateSiteVisitForm({
      client: 'x', site: 'x', siteAddress: 'x', machine, billingLines, billingOtherCharges, amountRupees,
    })
    if (validationError) { toast.error(validationError); return }
    setSaving(true)
    try {
      const res = await http.put<{ ok: boolean; error?: string }>(`/api/site-visits/${initial.visitMongoId}`, {
        visitDate, engineerName: engineerName.trim(), dwgNo: dwgNo.trim(), machineLabel: machine,
        workDescription: notes, notes: notes.trim(), paymentMode: paymentMode.trim(), paymentStatus,
        billingLines: billingLines.map((line) => {
          const q = parseFloat(line.quantity.replace(/[^\d.-]/g, '')) || 0
          const r = parseFloat(line.rate.replace(/[^\d.-]/g, '')) || 0
          const flat = parseFloat(line.amount.replace(/[^\d.-]/g, '')) || 0
          if (q !== 0 && r !== 0) return { particular: line.particular.trim(), quantity: q, rate: r }
          return { particular: line.particular.trim(), quantity: 0, rate: 0, ...(flat > 0 ? { amount: flat } : {}) }
        }),
        billingOtherCharges: parseFloat(billingOtherCharges.replace(/[^\d.-]/g, '')) || 0,
        amount: amountRupees,
      })
      if (!res.data?.ok) { toast.error(res.data?.error ?? 'Could not update visit'); return }
      toast.success('Site visit updated')
      onSaved()
      onClose()
    } catch { toast.error('Could not update visit') } finally { setSaving(false) }
  }


  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92svh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <div>
            <div className="text-base font-extrabold text-neutral-900">Edit site visit</div>
            <div className="text-xs font-semibold text-neutral-500">{initial.visitId}</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <label className="grid gap-1"><span className="text-xs font-bold text-neutral-700">Visit Date</span><input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className={fieldClass} /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-neutral-700">Engg. Name</span><input value={engineerName} onChange={(e) => setEngineerName(e.target.value)} className={fieldClass} placeholder="Engineer name" /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-neutral-700">DWG No.</span><input value={dwgNo} onChange={(e) => setDwgNo(e.target.value)} className={fieldClass} placeholder="Enter DWG number" /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-neutral-700">Machine</span><input value={machine} onChange={(e) => setMachine(e.target.value)} className={fieldClass} /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-neutral-700">Payment mode</span><input value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={fieldClass} /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-neutral-700">Payment status</span><AppSelect value={paymentStatus} onChange={setPaymentStatus} className={fieldClass} options={[{ value: 'pending', label: 'Pending' }, { value: 'partial', label: 'Partial' }, { value: 'paid', label: 'Paid' }, { value: 'waived', label: 'Waived' }]} /></label>
            {billingLines.map((line, idx) => (
              <div key={line.id} className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-2">
                <input value={line.particular} onChange={(e) => setBillingLines((prev) => prev.map((r) => r.id === line.id ? { ...r, particular: e.target.value } : r))} placeholder={`Particular #${idx + 1}`} className={fieldClass} />
                <input value={line.quantity} onChange={(e) => setBillingLines((prev) => prev.map((r) => r.id === line.id ? { ...r, quantity: e.target.value } : r))} placeholder="Qty" className={fieldClass} />
                <input value={line.rate} onChange={(e) => setBillingLines((prev) => prev.map((r) => r.id === line.id ? { ...r, rate: e.target.value } : r))} placeholder="Rate" className={fieldClass} />
                <input value={line.amount} onChange={(e) => setBillingLines((prev) => prev.map((r) => r.id === line.id ? { ...r, amount: e.target.value } : r))} placeholder="Flat amount" className={fieldClass} />
              </div>
            ))}
            <label className="grid gap-1"><span className="text-xs font-bold text-neutral-700">Other charges</span><input value={billingOtherCharges} onChange={(e) => setBillingOtherCharges(e.target.value)} className={fieldClass} /></label>
            <label className="grid gap-1"><span className="text-xs font-bold text-neutral-700">Notes / work details</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 outline-none focus:border-[#f39b03]/80 focus:ring-2 focus:ring-[#f39b03]/20" /></label>
            <div className="text-sm font-extrabold text-emerald-700">Amount: Rs {amountRupees.toLocaleString('en-IN')}</div>
          </div>
          <div className="flex justify-end gap-2 border-t border-neutral-100 px-4 py-3">
            <button type="button" onClick={onClose} className="h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-700">Cancel</button>
            <button type="submit" disabled={saving} className="h-11 rounded-xl bg-[#f39b03] px-5 text-sm font-extrabold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
