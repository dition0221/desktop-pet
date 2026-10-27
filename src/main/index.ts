import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { DEV_SERVER_URL } from '@main/appPage'
import { APP_SCHEME_PRIVILEGES, handleAppProtocol } from '@main/appProtocol'
import { startArrivalPoller } from '@main/bus/arrivalPoller'
import { registerBusIpc } from '@main/bus/handlers'
import { createMainWindow, showMainWindow } from '@main/mainWindow'
import { startOverlayWindows } from '@main/overlayWindows'
import { handlePackProtocol, PACK_SCHEME_PRIVILEGES } from '@main/pack/protocol'
import { loadSelectedPack, registerPackIpc } from '@main/pack/selection'
import { startPet } from '@main/pet/controller'
import { registerPetVisibilityIpc } from '@main/pet/visibility'
import { denyAllPermissions, registerWebContentsGuards } from '@main/security'
import { registerSecretsIpc } from '@main/store/secrets'
import { loadSettings, registerSettingsIpc } from '@main/store/settings'
import { createTray } from '@main/tray'
import { app, Menu, protocol } from 'electron'

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
  // app ready 전에 한 번만 호출 가능 — 커스텀 스킴은 여기서 함께 등록
  protocol.registerSchemesAsPrivileged([APP_SCHEME_PRIVILEGES, PACK_SCHEME_PRIVILEGES])
  registerWebContentsGuards()
  app.on('second-instance', showMainWindow)

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId(APP_USER_MODEL_ID)
    denyAllPermissions()
    if (!DEV_SERVER_URL) handleAppProtocol()
    handlePackProtocol()

    // autoHideMenuBar는 숨기기만 함 — 설치본에서 Alt로 기본 메뉴(Reload·DevTools)가 열리지 않게 제거
    if (!is.dev) Menu.setApplicationMenu(null)

    // 개발 모드는 F12로 DevTools 토글, 설치본은 Ctrl+R 새로고침 차단
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // 창이 첫 요청을 보내기 전에 설정·팩을 읽고 IPC를 연다
    await loadSettings()
    const pack = await loadSelectedPack()
    registerSettingsIpc()
    registerSecretsIpc()
    registerBusIpc()
    registerPackIpc()
    registerPetVisibilityIpc()
    createMainWindow()
    startArrivalPoller()
    startOverlayWindows()
    startPet(pack)
    createTray()
  })
}
