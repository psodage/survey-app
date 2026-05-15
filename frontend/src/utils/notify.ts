import { toast } from 'sonner'
import { getApiErrorMessage } from '../api/request'

export const SIGNATURE_MAX_BYTES = 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Returns a user-facing error message, or null if the file is valid. */
export function validateImageUpload(file: File, maxBytes = SIGNATURE_MAX_BYTES): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Please select an image file (PNG, JPEG, GIF, or WebP).'
  }
  if (file.size > maxBytes) {
    return `File must be 1 MB or smaller (selected: ${formatFileSize(file.size)}).`
  }
  return null
}

export const notify = {
  success(message: string) {
    toast.success(message)
  },
  error(message: string) {
    toast.error(message)
  },
  info(message: string) {
    toast.message(message)
  },
  loading(message: string) {
    return toast.loading(message)
  },
  dismiss(id?: string | number) {
    toast.dismiss(id)
  },
  apiError(err: unknown, fallback = 'Something went wrong.') {
    toast.error(getApiErrorMessage(err, fallback))
  },
  async run<T>(
    loadingMessage: string,
    fn: () => Promise<T>,
    options: { success: string; error?: string },
  ): Promise<T | undefined> {
    const id = toast.loading(loadingMessage)
    try {
      const result = await fn()
      toast.success(options.success, { id })
      return result
    } catch (err) {
      toast.error(options.error ?? getApiErrorMessage(err), { id })
      return undefined
    }
  },
}
