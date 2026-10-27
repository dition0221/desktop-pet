import { join } from 'node:path'
import { showMainWindow } from '@main/mainWindow'
import { isPetVisible, onPetVisibleChange, setPetVisible } from '@main/pet/visibility'
import { app, Menu, Tray } from 'electron'

const TRAY_ICON_PATH = join(app.getAppPath(), 'resources/icon.png')

/** 모듈 변수로 붙잡아 둠 — GC되면 트레이 아이콘이 사라진다 */
let tray: Tray | null = null

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: '메인 창 열기', click: showMainWindow },
    {
      label: '펫 보이기',
      type: 'checkbox',
      checked: isPetVisible(),
      click: (item) => setPetVisible(item.checked)
    },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() }
  ])
}

export function createTray(): void {
  tray = new Tray(TRAY_ICON_PATH)
  tray.setToolTip(app.getName())
  tray.setContextMenu(buildMenu())
  tray.on('click', showMainWindow)
  onPetVisibleChange(() => tray?.setContextMenu(buildMenu()))
}
