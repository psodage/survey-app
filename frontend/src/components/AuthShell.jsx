import { layoutBrandLogo } from '../brandLogo'

const LogoBlock = ({ centered = false }) => (
  <div className={`flex items-center ${centered ? 'justify-center' : 'justify-start'}`}>
    <img
      src={layoutBrandLogo}
      alt="समर्थ LAND SURVEYOR'S"
      className="h-auto w-[170px] object-contain sm:w-[190px] lg:w-[200px]"
      draggable={false}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onAuxClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onContextMenu={(event) => {
        event.preventDefault()
      }}
      onError={(event) => {
        event.currentTarget.style.display = 'none'
        const fallback = event.currentTarget.nextElementSibling
        if (fallback) fallback.classList.remove('hidden')
      }}
    />
    <div className="hidden">
      <p className="text-[34px] leading-[0.95] font-bold tracking-tight text-[#f39b03]">समर्थ</p>
      <p className="mt-1 text-[11px] font-semibold tracking-[0.24em] text-white">LAND SURVEYOR&apos;S</p>
    </div>
  </div>
)

/**
 * @param {{ title: string, subtitle?: string, children: import('react').ReactNode }} props
 */
export function AuthShell({ title, subtitle, children }) {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/login-bg.png')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#020307]/72 via-[#050c16]/62 to-[#02050c]/74" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(243,155,3,0.10),transparent_42%),radial-gradient(circle_at_12%_80%,rgba(29,78,216,0.14),transparent_46%)]" />

      <section className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-8 md:px-8">
        <div className="w-full max-w-[560px] rounded-[10px] border border-white/15 bg-[linear-gradient(160deg,rgba(10,14,20,.76),rgba(8,11,17,.66))] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-6 md:p-7 lg:p-8">
          <div className="mb-6">
            <LogoBlock centered />
          </div>
          <div className="mb-6 text-center">
            <h2 className="text-[28px] leading-tight font-bold text-white sm:text-[32px]">{title}</h2>
            {subtitle ? <p className="mt-2 text-[15px] leading-relaxed text-white/58 sm:text-[16px]">{subtitle}</p> : null}
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
