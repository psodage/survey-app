/** Earliest year shown in the record-year picker (inclusive). */
export const MIN_RECORD_YEAR = 2025

export function maxRecordYear(): number {
  return new Date().getFullYear() + 1
}

export function recordYearOptions(): string[] {
  const max = maxRecordYear()
  const out: string[] = []
  for (let y = max; y >= MIN_RECORD_YEAR; y--) out.push(String(y))
  return out
}

/** Keeps stored / incoming year within the selectable range. */
export function clampRecordYearString(raw: string | undefined | null): string {
  const max = maxRecordYear()
  const fallback = String(Math.min(max, Math.max(MIN_RECORD_YEAR, new Date().getFullYear())))
  if (!raw || !/^\d{4}$/.test(raw)) return fallback
  const y = parseInt(raw, 10)
  if (!Number.isFinite(y)) return fallback
  return String(Math.min(max, Math.max(MIN_RECORD_YEAR, y)))
}
