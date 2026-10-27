import { loadAppPage, PRELOAD_PATH } from '@main/appPage'
import { registerWindowRole } from '@main/ipc'
import { secureWebPreferences } from '@main/security'
import { app, BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null
let quitting = false

export function createMainWindow(): void {
  const window = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      ...secureWebPreferences,
      preload: PRELOAD_PATH
    }
  })
  registerWindowRole(window, 'main')

  window.once('ready-to-show', () => {
    window.show()
  })

  window.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    window.hide()
  })

  // Windows 종료·로그오프 때는 before-quit가 오지 않음 — 닫기를 막으면 시스템 종료를 붙잡는다
  window.on('session-end', () => {
    quitting = true
  })

  window.on('closed', () => {
    mainWindow = null
  })

  void loadAppPage(window, 'index')
  mainWindow = window
}

export function showMainWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

app.on('before-quit', () => {
  quitting = true
})
