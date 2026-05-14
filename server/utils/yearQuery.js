/**
 * Calendar-year range on `visitDate` for MongoDB queries.
 * Returns undefined when `year` is missing or invalid (no extra filter).
 */
export function visitDateRangeForYear(yearRaw) {
  if (yearRaw === undefined || yearRaw === null || yearRaw === '') return undefined
  const y = typeof yearRaw === 'string' ? parseInt(yearRaw, 10) : Number(yearRaw)
  if (!Number.isFinite(y) || y < 1970 || y > 2100) return undefined
  return {
    $gte: new Date(Date.UTC(y, 0, 1)),
    $lte: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
  }
}
