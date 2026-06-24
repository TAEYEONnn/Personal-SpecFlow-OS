type StorageAccessEnvironment = {
  embedded: boolean
  requestAccess?: () => Promise<void>
}

export async function ensureStorageAccess({
  embedded,
  requestAccess,
}: StorageAccessEnvironment): Promise<boolean> {
  if (!embedded || !requestAccess) return false

  try {
    await requestAccess()
    return true
  } catch {
    return false
  }
}

export function ensureBrowserStorageAccess(): Promise<boolean> {
  return ensureStorageAccess({
    embedded: window.top !== window.self,
    requestAccess:
      typeof document.requestStorageAccess === 'function'
        ? () => document.requestStorageAccess()
        : undefined,
  })
}
