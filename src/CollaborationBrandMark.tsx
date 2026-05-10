import { layoutBrandLogo } from './brandLogo'
import dgpsLogo from './assets/dgps-logo.png'

type CollaborationBrandMarkProps = {
  variant: 'desktopSidebar' | 'mobileHeader'
}

export function CollaborationBrandMark({ variant }: CollaborationBrandMarkProps) {
  if (variant === 'desktopSidebar') {
    return (
      <div className="flex w-full min-w-0 max-w-full flex-col">
        <div
          className="flex w-full min-w-0 max-w-full flex-col items-center gap-2"
          role="img"
          aria-label="Samarth Land Surveyors in collaboration with DGPS"
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
                src={dgpsLogo}
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
      aria-label="Samarth Land Surveyors in collaboration with DGPS"
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
        src={dgpsLogo}
        alt=""
        draggable={false}
        className="h-5 max-h-[28px] w-auto max-w-[38%] shrink object-contain object-center sm:h-6 sm:max-h-[30px]"
      />
    </div>
  )
}
