import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { clampRecordYearString, maxRecordYear, MIN_RECORD_YEAR } from '../recordYearConfig'

const STORAGE_KEY = 'survey-app-record-year'

function readStoredYear(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && /^\d{4}$/.test(raw)) return clampRecordYearString(raw)
  } catch {
    /* ignore */
  }
  return clampRecordYearString(String(new Date().getFullYear()))
}

type SelectedYearContextValue = {
  selectedYear: string
  setSelectedYear: (year: string) => void
}

const SelectedYearContext = createContext<SelectedYearContextValue | null>(null)

export function SelectedYearProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setYearState] = useState(readStoredYear)

  const setSelectedYear = useCallback((year: string) => {
    if (!/^\d{4}$/.test(year)) return
    const y = parseInt(year, 10)
    if (y < MIN_RECORD_YEAR || y > maxRecordYear()) return
    const next = clampRecordYearString(year)
    setYearState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(() => ({ selectedYear, setSelectedYear }), [selectedYear, setSelectedYear])

  return <SelectedYearContext.Provider value={value}>{children}</SelectedYearContext.Provider>
}

export function useSelectedYear() {
  const ctx = useContext(SelectedYearContext)
  if (!ctx) throw new Error('useSelectedYear must be used within SelectedYearProvider')
  return ctx
}
