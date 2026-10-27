import { loadAppPage, PRELOAD_PATH } from '@main/appPage'
import { registerWindowRole } from '@main/ipc'
import { isPetVisible, onPetVisibleChange } from '@main/pet/visibility'
import { secureWebPreferences } from '@main/security'
import { BrowserWindow, type Display, screen } from 'electron'

const overlayWindowsByDisplayId = new Map<number, BrowserWindow>()
const syncedListeners = new Set<() => void>()

/** TODO(Phase 3) — 다중 모니터: 모든 디스플레이 */
function targetDisplays(): Display[] {
  return [screen.getPrimaryDisplay()]
}

function createOverlayWindow(display: Display): BrowserWindow {
  const window = new BrowserWindow({
    // 화면 전체 크기의 항상 위 창은 Windows가 전체 화면 앱으로 판정 — 작업 영역만 덮는다
    ...display.workArea,
    show: false,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      ...secureWebPreferences,
      preload: PRELOAD_PATH
    }
  })
  registerWindowRole(window, 'overlay')
  // forward 옵션은 Windows에서 아래 창 커서를 깜빡이게 함 — 펫 위인지는 pet/controller가 커서 좌표로 판정
  window.setIgnoreMouseEvents(true)

  window.once('ready-to-show', () => {
    if (isPetVisible()) window.showInactive()
  })

  window.once('closed', () => {
    if (overlayWindowsByDisplayId.get(display.id) === window)
      overlayWindowsByDisplayId.delete(display.id)
  })

  void loadAppPage(window, 'overlay')
  return window
}

function syncOverlayWindows(): void {
  const displays = targetDisplays()
  const displayIds = new Set(displays.map((display) => display.id))

  for (const [id, window] of overlayWindowsByDisplayId) {
    if (displayIds.has(id)) continue
    window.destroy()
    overlayWindowsByDisplayId.delete(id)
  }

  for (const display of displays) {
    const window = overlayWindowsByDisplayId.get(display.id)
    if (window) window.setBounds(display.workArea)
    else overlayWindowsByDisplayId.set(display.id, createOverlayWindow(display))
  }

  for (const listener of syncedListeners) listener()
}

function setOverlaysVisible(visible: boolean): void {
  for (const window of overlayWindowsByDisplayId.values()) {
    if (visible) window.showInactive()
    else window.hide()
  }
}

export function forEachOverlay(callback: (window: BrowserWindow) => void): void {
  for (const window of overlayWindowsByDisplayId.values()) callback(window)
}

/** 디스플레이 변경으로 창을 만들거나 옮긴 뒤 호출 — 창 bounds가 이미 새 값이다 */
export function onOverlaysSynced(listener: () => void): void {
  syncedListeners.add(listener)
}

export function setOverlaysIgnoreMouse(ignore: boolean): void {
  for (const window of overlayWindowsByDisplayId.values()) window.setIgnoreMouseEvents(ignore)
}

export function startOverlayWindows(): void {
  syncOverlayWindows()
  screen.on('display-added', syncOverlayWindows)
  screen.on('display-removed', syncOverlayWindows)
  screen.on('display-metrics-changed', syncOverlayWindows)
  onPetVisibleChange(setOverlaysVisible)
}
