import './GlobalLoader.css'

type GlobalLoaderProps = {
  visible: boolean
  message: string
}

export default function GlobalLoader({ visible, message }: GlobalLoaderProps) {
  return (
    <div
      aria-busy={visible}
      aria-live="polite"
      aria-hidden={!visible}
      className={`global-loader ${visible ? 'global-loader--visible' : ''}`}
      role="status"
    >
      <div className="global-loader__backdrop" aria-hidden />
      <div className="global-loader__panel">
        <div className="global-loader__spinner" aria-hidden />
        <p className="global-loader__message">{message}</p>
        <p className="global-loader__hint">Please wait while we connect to the server.</p>
      </div>
    </div>
  )
}
