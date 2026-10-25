import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { denyAllPermissions, registerWebContentsGuards, secureWebPreferences } from '@main/security'
import { app, BrowserWindow, Menu } from 'electron'

const APP_USER_MODEL_ID = 'io.github.dition0221.desktop-pet'

// app ready 전에 바꿔야 적용됨 — 개발 데이터를 설치본 설정·키와 분리
if (is.dev) {
  app.setPath('userData', `${app.getPath('userData')}-dev`)
}

registerWebContentsGuards()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      ...secureWebPreferences,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId(APP_USER_MODEL_ID)
  denyAllPermissions()

  // autoHideMenuBar는 숨기기만 함 — 설치본에서 Alt로 기본 메뉴(Reload·DevTools)가 열리지 않게 제거
  if (!is.dev) Menu.setApplicationMenu(null)

  // 개발 모드는 F12로 DevTools 토글, 설치본은 Ctrl+R 새로고침 차단
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
