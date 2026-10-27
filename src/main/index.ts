import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { DEV_SERVER_URL } from '@main/appPage'
import { handleAppProtocol, registerAppScheme } from '@main/appProtocol'
import { createMainWindow, showMainWindow } from '@main/mainWindow'
import { startOverlayWindows } from '@main/overlayWindows'
import { startPet } from '@main/pet/controller'
import { registerPetVisibilityIpc } from '@main/pet/visibility'
import { denyAllPermissions, registerWebContentsGuards } from '@main/security'
import { createTray } from '@main/tray'
import { app, Menu } from 'electron'

const APP_USER_MODEL_ID = 'io.github.dition0221.desktop-pet'

// app ready 전에 바꿔야 적용됨 — 개발 데이터를 설치본 설정·키와 분리
if (is.dev) {
  app.setPath('userData', `${app.getPath('userData')}-dev`)
}

// 잠금은 userData 폴더 기준이라 개발 모드와 설치본은 동시에 실행된다
if (app.requestSingleInstanceLock()) {
  bootstrap()
} else {
  app.quit()
}

function bootstrap(): void {
  registerAppScheme()
  registerWebContentsGuards()
  app.on('second-instance', showMainWindow)

  app.whenReady().then(() => {
    electronApp.setAppUserModelId(APP_USER_MODEL_ID)
    denyAllPermissions()
    if (!DEV_SERVER_URL) handleAppProtocol()

    // autoHideMenuBar는 숨기기만 함 — 설치본에서 Alt로 기본 메뉴(Reload·DevTools)가 열리지 않게 제거
    if (!is.dev) Menu.setApplicationMenu(null)

    // 개발 모드는 F12로 DevTools 토글, 설치본은 Ctrl+R 새로고침 차단
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerPetVisibilityIpc()
    createMainWindow()
    startOverlayWindows()
    startPet()
    createTray()
  })
}
