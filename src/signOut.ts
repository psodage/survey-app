export async function signOut(): Promise<void> {
  // Auth is disabled in frontend mode; keep the same async API shape for callers.
  return Promise.resolve()
}
