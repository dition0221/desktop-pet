import type { DesktopPetApi } from '@preload/api'
import { contextBridge } from 'electron'

/** 기능 단위 함수만 노출 — ipcRenderer 통째 노출 금지, sandbox라 Node 모듈 require 불가 */
const api: DesktopPetApi = {}

contextBridge.exposeInMainWorld('api', api)
