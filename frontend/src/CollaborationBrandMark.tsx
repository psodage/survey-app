import { useMemo } from 'react'
import { layoutBrandLogo } from './brandLogo'
import dgpsLogo from './assets/dgps-logo.png'
import tsLogo from './assets/ts-logo.png'
import { useAuth } from './context/AuthContext'

type CollaborationBrandMarkProps = {
  variant: 'desktopSidebar' | 'mobileHeader'
}

function useMachineLogoSrc() {
  const { instruments, activeInstrumentId } = useAuth()
  return useMemo(() => {
    const inst = instruments.find((i) => i.id === activeInstrumentId) ?? instruments[0]
    const cat = inst?.category?.trim().toLowerCase() ?? ''
    if (cat === 'total station') return tsLogo
    if (cat === 'dgps') return dgpsLogo
    return dgpsLogo
  }, [instruments, activeInstrumentId])
}

function useCollaborationAriaLabel() {
  const { instruments, activeInstrumentId } = useAuth()
  return useMemo(() => {
    const inst = instruments.find((i) => i.id === activeInstrumentId) ?? instruments[0]
    const cat = inst?.category?.trim() ?? ''
    if (cat.toLowerCase() === 'total station') {
      return 'Samarth Land Surveyors in collaboration with Total Station'
    }
    if (cat.toLowerCase() === 'dgps') {
      return 'Samarth Land Surveyors in collaboration with DGPS'
    }
    return 'Samarth Land Surveyors in collaboration with DGPS'
  }, [instruments, activeInstrumentId])
}

export function CollaborationBrandMark({ variant }: CollaborationBrandMarkProps) {
  const machineLogoSrc = useMachineLogoSrc()
  const collaborationAriaLabel = useCollaborationAriaLabel()

  if (variant === 'desktopSidebar') {
    return (
      <div className="flex w-full min-w-0 max-w-full flex-col">
        <div
          className="flex w-full min-w-0 max-w-full flex-col items-center gap-2"
          role="img"
          aria-label={collaborationAriaLabel}
        >
          <img
            src={layoutBrandLogo}
            alt=""
            draggable={false}
            className="mx-auto h-[4.5rem] w-auto max-w-[92%] object-contain object-center sm:h-[5rem]"
          />
          <div className="flex w-full min-w-0 max-w-full flex-col items-center gap-1.5">
            <span
              className="block w-full shrink-0 select-none text-center text-2xl font-light leading-none text-white/55 sm:text-3xl"
              aria-hidden="true"
            >
              ×
            </span>
            <div className="flex w-full min-w-0 justify-center">
              <img
                src={machineLogoSrc}
                alt=""
                draggable={false}
                className="h-6 w-auto max-h-6 max-w-[85%] object-contain object-center sm:h-7 sm:max-h-7"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 h-px w-full shrink-0 bg-white/10" aria-hidden />
      </div>
    )
  }

  return (
    <div
      className="flex min-w-0 max-w-full items-center justify-center gap-1.5 sm:gap-2"
      role="img"
      aria-label={collaborationAriaLabel}
    >
      <img
        src={layoutBrandLogo}
        alt=""
        draggable={false}
        className="h-[60px] max-h-[64px] w-auto max-w-[42%] shrink object-contain object-center sm:h-[68px] sm:max-h-[72px] sm:max-w-[40%]"
      />
      <span
        className="shrink-0 select-none text-xl font-light leading-none text-white/55 sm:text-2xl"
        aria-hidden="true"
      >
        ×
      </span>
      <img
        src={machineLogoSrc}
        alt=""
        draggable={false}
        className="h-5 max-h-[28px] w-auto max-w-[38%] shrink object-contain object-center sm:h-6 sm:max-h-[30px]"
      />
    </div>
  )
}
