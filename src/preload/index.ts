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
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    onChange: (listener) => subscribe(IPC.settingsChanged, listener)
  },
  packs: {
    list: () => ipcRenderer.invoke(IPC.packList),
    select: (id) => ipcRenderer.invoke(IPC.packSelect, id)
  },
  secrets: {
    getStatus: (id) => ipcRenderer.invoke(IPC.secretsGetStatus, id),
    save: (id, value) => ipcRenderer.invoke(IPC.secretsSave, { id, value }),
    remove: (id) => ipcRenderer.invoke(IPC.secretsDelete, id)
  },
  bus: {
    testKey: () => ipcRenderer.invoke(IPC.busTestKey),
    nearbyStops: (lat, lng) => ipcRenderer.invoke(IPC.busNearbyStops, { lat, lng }),
    searchStops: (name) => ipcRenderer.invoke(IPC.busSearchStops, name),
    stopRoutes: (stopId) => ipcRenderer.invoke(IPC.busStopRoutes, stopId),
    routePath: (routeId) => ipcRenderer.invoke(IPC.busRoutePath, routeId),
    addFavorite: (favorite) => ipcRenderer.invoke(IPC.busAddFavorite, favorite),
    removeFavorite: (stopId, routeId) =>
      ipcRenderer.invoke(IPC.busRemoveFavorite, { stopId, routeId }),
    getArrivals: () => ipcRenderer.invoke(IPC.busGetArrivals),
    onArrivalsChange: (listener) => subscribe(IPC.busArrivalsChanged, listener),
    setPollSettings: (settings) => ipcRenderer.invoke(IPC.busSetPollSettings, settings),
    setFavoriteAlert: (stopId, routeId, enabled) =>
      ipcRenderer.invoke(IPC.busSetFavoriteAlert, { stopId, routeId, enabled })
  },
  pet: {
    setVisible: (visible) => ipcRenderer.invoke(IPC.petSetVisible, visible),
    getSprite: () => ipcRenderer.invoke(IPC.petGetSprite),
    onSpriteChange: (listener) => subscribe(IPC.petSpriteChanged, listener),
    onSpeech: (listener) => subscribe(IPC.petSpeech, listener),
    getMotion: () => ipcRenderer.invoke(IPC.petGetMotion),
    onMotionChange: (listener) => subscribe(IPC.petMotionChanged, listener),
    openMainWindow: () => ipcRenderer.invoke(IPC.petOpenMainWindow),
    showContextMenu: () => ipcRenderer.invoke(IPC.petShowContextMenu)
  }
}

contextBridge.exposeInMainWorld('api', api)
