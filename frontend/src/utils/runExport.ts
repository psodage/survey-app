import { toast } from 'sonner'
import { getApiErrorMessage } from '../api/request'

/** Run an export with loading + success/error toasts. */
export async function runExport(label: string, fn: () => Promise<void>): Promise<boolean> {
  const id = toast.loading(`Exporting ${label}…`)
  try {
    await fn()
    toast.success(`${label} ready`, { id })
    return true
  } catch (err) {
    toast.error(getApiErrorMessage(err, `Could not export ${label}.`), { id })
    return false
  }
}
