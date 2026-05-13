import { Briefcase, ChevronDown } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { ACCOUNT_MANAGERS } from './accountManagersData'
import http from './api/http'
import { useAuth } from './context/AuthContext'

type InstrumentPeerAm = {
  adminId: string
  accountManagerSlug: string | null
  fullName: string
  shortName: string
  phone: string
  email: string
}

type AccountManagerSidebarBlockProps = {
  pathname: string
  onNavigate: (path: string) => void
  onAfterNavigate?: () => void
}

export function AccountManagerSidebarBlock({
  pathname,
  onNavigate,
  onAfterNavigate,
}: AccountManagerSidebarBlockProps) {
  const { managers, token, activeInstrumentId } = useAuth()
  const [instrumentPages, setInstrumentPages] = useState<InstrumentPeerAm[]>([])

  useEffect(() => {
    if (!token || !activeInstrumentId) {
      setInstrumentPages([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await http.get<{ ok: boolean; admins: InstrumentPeerAm[] }>('/api/instruments/coworkers', {
          params: { instrumentId: activeInstrumentId },
        })
        if (cancelled) return
        if (res.data?.ok) setInstrumentPages(res.data.admins ?? [])
        else setInstrumentPages([])
      } catch {
        if (!cancelled) setInstrumentPages([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, activeInstrumentId])

  const sidebarManagers = useMemo(() => {
    const fromInstrument = instrumentPages
      .filter((a) => a.accountManagerSlug)
      .map((a) => ({
        id: a.accountManagerSlug as string,
        name: a.fullName || a.email || 'Account manager',
        shortName: a.shortName || a.fullName || '—',
        phone: a.phone,
      }))
    if (fromInstrument.length > 0) return fromInstrument
    return managers.length
      ? managers.map((m) => ({ id: m.id, name: m.name, shortName: m.shortName, phone: m.phone }))
      : ACCOUNT_MANAGERS.map((m) => ({ id: m.id, name: m.name, shortName: m.shortName, phone: m.phone }))
  }, [instrumentPages, managers])

  const isUnderAccount = pathname.startsWith('/account-manager')
  const [open, setOpen] = useState(false)
  const submenuId = useId()

  /** Desktop: keep dropdown closed when on Account Manager; only the parent row stays active. Mobile: expand so the list is visible in the drawer. */
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(min-width: 1024px)').matches) return
    if (isUnderAccount) setOpen(true)
  }, [isUnderAccount])

  const go = (path: string) => {
    onNavigate(path)
    onAfterNavigate?.()
    setOpen(false)
  }

  return (
    <div className="touch-manipulation rounded-xl ring-1 ring-white/[0.08] bg-white/[0.02]">
      {/*
        Mobile: flex-col-reverse → list above the row (easier reach). Desktop (lg+): normal column → list below.
      */}
      <div className="flex flex-col-reverse gap-1 lg:flex-col">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={submenuId}
          id={`${submenuId}-trigger`}
          onClick={() => setOpen((v) => !v)}
          className={[
            'flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 active:bg-white/[0.04]',
            isUnderAccount
              ? 'bg-[#f39b03]/14 text-[#f39b03] ring-1 ring-[#f39b03]/35'
              : 'text-white/88 ring-1 ring-transparent hover:bg-white/[0.06] hover:text-white',
          ].join(' ')}
        >
          <span
            className={[
              'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors',
              isUnderAccount ? 'bg-[#f39b03]/18 text-[#f39b03]' : 'bg-white/[0.07] text-white/80',
            ].join(' ')}
          >
            <Briefcase size={16} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-white/50">
              Account manager
            </span>
            <span className="block truncate text-[13px] font-semibold leading-tight text-white/95">
              {open ? (
                <>
                  <span className="lg:hidden">Choose a page above</span>
                  <span className="hidden lg:inline">Choose a page below</span>
                </>
              ) : (
                'Tap to see available pages'
              )}
            </span>
          </span>
          <span
            className={[
              'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-200 ease-out',
              open ? '-rotate-180' : 'rotate-0',
              isUnderAccount ? 'bg-[#f39b03]/12 text-[#f39b03]' : 'bg-white/[0.06] text-white/65',
            ].join(' ')}
            aria-hidden
          >
            <ChevronDown size={16} strokeWidth={2.25} />
          </span>
        </button>

        <div
          id={submenuId}
          role="region"
          aria-labelledby={`${submenuId}-trigger`}
          className={[
            'grid transition-[grid-template-rows] duration-200 ease-out',
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          ].join(' ')}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mb-0.5 rounded-lg border border-white/[0.08] bg-black/40 px-1.5 pb-1.5 pt-1.5 ring-1 ring-white/[0.05]">
              <p className="px-2 pb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white/45">
                Available account manager pages
              </p>
              <ul className="flex flex-col gap-0.5" role="list">
                {sidebarManagers.map((m) => {
                  const path = `/account-manager/${m.id}`
                  const subActive = pathname === path
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => go(path)}
                        className={[
                          'flex min-h-[44px] w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors duration-150 active:opacity-90',
                          subActive
                            ? 'bg-[#f39b03]/22 text-[#f39b03] shadow-[inset_3px_0_0_0_rgba(243,155,3,0.95)]'
                            : 'text-white/72 hover:bg-white/[0.07] hover:text-white',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'grid h-8 w-8 shrink-0 place-items-center rounded-md text-[11px] font-extrabold',
                            subActive
                              ? 'bg-[#f39b03]/25 text-[#f39b03]'
                              : 'bg-white/[0.06] text-white/55',
                          ].join(' ')}
                          aria-hidden
                        >
                          {m.shortName
                            .split(/\s+/)
                            .map((w) => w[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold leading-snug">
                            {m.name}
                          </span>
                          <span className="block truncate text-[10px] font-semibold text-white/50">
                            {m.phone}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
