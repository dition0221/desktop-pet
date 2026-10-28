import { DEV_SERVER_URL, isAppPageUrl } from '@main/appPage'
import { toAllowedExternalUrl } from '@main/externalUrl'
import { app, session, shell, type WebPreferences } from 'electron'

export const secureWebPreferences = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
  webviewTag: false
} as const satisfies WebPreferences

/** 개발 모드 HMR 전체 새로고침만 허용 */
function isAllowedNavigation(rawUrl: string): boolean {
  return DEV_SERVER_URL !== undefined && isAppPageUrl(rawUrl)
}

/** Electron 기본값은 카메라·마이크 등 모든 권한 자동 허용 — app ready 이후 호출 */
export function denyAllPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_, __, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)
}

/** 나중에 생기는 창(펫 오버레이 등)에도 자동 적용 */
export function registerWebContentsGuards(): void {
  app.on('web-contents-created', (_, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      const externalUrl = toAllowedExternalUrl(url)
      if (externalUrl) void shell.openExternal(externalUrl)
      return { action: 'deny' }
    })

    contents.on('will-navigate', (event, url) => {
      if (!isAllowedNavigation(url)) event.preventDefault()
    })

    contents.on('will-attach-webview', (event) => {
      event.preventDefault()
    })
  })
}
