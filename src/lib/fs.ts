import { appDataDir, BaseDirectory } from '@tauri-apps/api/path'
import { mkdir } from '@tauri-apps/plugin-fs'

export const createAppDataDir = async () => {
  const appDataDirPath = await appDataDir()
  // Ensure the app data directory exists
  try {
    await mkdir('data', { recursive: true, baseDir: BaseDirectory.AppData })
    console.log('App data directory initialized:', appDataDirPath)
  } catch (error) {
    console.error('Failed to create app data directory:', error)
  }

  return appDataDirPath
}
