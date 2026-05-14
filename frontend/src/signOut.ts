import { tokenStorage } from './api/http'

/** Clears auth and notifies the app; same async shape for existing callers. */
export async function signOut(): Promise<void> {
  tokenStorage.clear()
  window.dispatchEvent(new CustomEvent('survey:logout'))
}
