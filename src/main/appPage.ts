import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { APP_ORIGIN } from '@main/appProtocol'
import type { BrowserWindow } from 'electron'

export type AppPage = 'index' | 'overlay'

export const PRELOAD_PATH = join(__dirname, '../preload/index.js')

/** electron-vite preview는 is.dev지만 dev 서버가 없음 — dev 서버 분기는 이 값으로만 */
export const DEV_SERVER_URL = is.dev ? process.env.ELECTRON_RENDERER_URL : undefined

function appOrigin(): string {
  return DEV_SERVER_URL ? new URL(DEV_SERVER_URL).origin : APP_ORIGIN
}

export function loadAppPage(window: BrowserWindow, page: AppPage): Promise<void> {
  return window.loadURL(`${appOrigin()}/${page}.html`)
}

export function isAppPageUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    // Node URL은 커스텀 스킴의 origin을 'null'로 돌려줌
    return `${url.protocol}//${url.host}` === appOrigin()
  } catch {
    return false
  }
}
