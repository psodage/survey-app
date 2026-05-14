/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Production API origin (no path suffix), e.g. `https://survey-api.onrender.com` */
  readonly VITE_API_BASE_URL?: string
  /** @deprecated use VITE_API_BASE_URL */
  readonly VITE_API_URL?: string
  /** Dev-only: override default `http://localhost:4000` for Vite `/api` proxy */
  readonly VITE_API_PROXY_TARGET?: string
  /** Dev-only: comma-separated extra allowed dev server hostnames */
  readonly VITE_DEV_ALLOWED_HOSTS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
