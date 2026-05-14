import { Fragment, useMemo } from 'react'
import { Mail, Phone } from 'lucide-react'
import { layoutBrandLogo } from './brandLogo'
import { useAuth } from './context/AuthContext'

const DEFAULT_EMAIL = 'samarthlandsurveyors@gmail.com'

function formatEngineerLine(fullName: string, phone: string) {
  const name = (fullName || '').trim()
  const ph = (phone || '').trim()
  const base = name.replace(/^Er\.\s*/i, '').trim()
  const withTitle = base ? `Er. ${base}` : ''
  return [withTitle, ph].filter(Boolean).join(' ')
}

export function LayoutFooter() {
  const { company, companyAdmins } = useAuth()
  const email = useMemo(() => {
    const e = company?.email && String(company.email).trim()
    return e || DEFAULT_EMAIL
  }, [company?.email])

  const adminsWithContact = useMemo(
    () => companyAdmins.filter((a) => formatEngineerLine(a.fullName, a.phone).length > 0),
    [companyAdmins],
  )

  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 hidden border-t border-white/10 bg-gradient-to-b from-[#050505] via-[#0b0b0b] to-[#040404] text-white shadow-[0_-12px_30px_rgba(0,0,0,0.3)] md:block">
      <div className="mx-auto flex w-full max-w-none items-center justify-between gap-3 px-3 py-2 sm:px-5 sm:py-3">
        <img
          src={layoutBrandLogo}
          alt="Samarth Land Surveyors"
          className="h-9 w-auto shrink-0 sm:h-10"
          draggable={false}
        />

        <div className="hidden min-w-0 flex-1 items-center justify-end text-xs font-bold text-white/95 md:flex">
          {adminsWithContact.map((admin, i) => (
            <Fragment key={admin.id}>
              {i > 0 ? <div className="h-6 w-px shrink-0 bg-white/25" aria-hidden /> : null}
              <div
                className={
                  i === 0
                    ? 'flex min-w-0 items-center gap-2 pr-5'
                    : 'flex min-w-0 items-center gap-2 px-5'
                }
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f39b03]/20 text-[#f39b03] ring-1 ring-[#f39b03]/45">
                  <Phone size={13} />
                </span>
                <span className="truncate">{formatEngineerLine(admin.fullName, admin.phone)}</span>
              </div>
            </Fragment>
          ))}
          {adminsWithContact.length > 0 ? (
            <div className="h-6 w-px shrink-0 bg-white/25" aria-hidden />
          ) : null}
          <div
            className={
              adminsWithContact.length === 0
                ? 'flex min-w-0 items-center gap-2'
                : 'flex min-w-0 items-center gap-2 pl-5'
            }
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f39b03]/20 text-[#f39b03] ring-1 ring-[#f39b03]/45">
              <Mail size={13} />
            </span>
            <span className="truncate">{email}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
