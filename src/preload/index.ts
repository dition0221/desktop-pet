import type { DesktopPetApi } from '@preload/api'
import { IPC } from '@preload/channels'
import { contextBridge, type IpcRendererEvent, ipcRenderer } from 'electron'

/** event 객체는 넘기지 않음 — event.sender로 ipcRenderer가 렌더러에 노출됨 */
function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const wrapped = (_: IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, wrapped)
  return () => {
    ipcRenderer.removeListener(channel, wrapped)
  }
}

/** 기능 단위 함수만 노출 — ipcRenderer 통째 노출 금지, sandbox라 Node 모듈 require 불가 */
const api: DesktopPetApi = {
  pet: {
    getVisible: () => ipcRenderer.invoke(IPC.petGetVisible),
    setVisible: (visible) => ipcRenderer.invoke(IPC.petSetVisible, visible),
    onVisibleChange: (listener) => subscribe(IPC.petVisibleChanged, listener),
    getMotion: () => ipcRenderer.invoke(IPC.petGetMotion),
    onMotionChange: (listener) => subscribe(IPC.petMotionChanged, listener),
    openMainWindow: () => ipcRenderer.invoke(IPC.petOpenMainWindow),
    showContextMenu: () => ipcRenderer.invoke(IPC.petShowContextMenu)
  }
}

contextBridge.exposeInMainWorld('api', api)
