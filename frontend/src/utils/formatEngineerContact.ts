export function formatEngineerLine(fullName: string, phone: string, separator = ' ') {
  const name = (fullName || '').trim()
  const ph = (phone || '').trim()
  const base = name.replace(/^Er\.\s*/i, '').trim()
  const withTitle = base ? `Er. ${base}` : ''
  return [withTitle, ph].filter(Boolean).join(separator)
}
