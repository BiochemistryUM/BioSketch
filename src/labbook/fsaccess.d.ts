// The parts of the File System Access API the notebook uses that the standard library does not yet
// describe. Everything else (FileSystemDirectoryHandle, createWritable, values…) comes from the DOM
// library. Chromium browsers have this API; Safari and Firefox do not, so the notebook checks first.
export {}

declare global {
  interface Window {
    showDirectoryPicker(options?: { id?: string; mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
  }
  interface FileSystemHandle {
    queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
    requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  }
}
