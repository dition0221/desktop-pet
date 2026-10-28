import { broadcast, handle } from '@main/ipc'
import { sayToPet } from '@main/pet/speech'
import type { UpdateSnapshot, UpdateStatus } from '@preload/api'
import { IPC } from '@preload/channels'
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { z } from 'zod'

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
/** 시작 직후 창·팩 로딩과 겹치지 않게 */
const FIRST_CHECK_DELAY_MS = 10_000

let status: UpdateStatus = app.isPackaged ? { state: 'idle' } : { state: 'dev' }
/** 두 번 띄우면 설치 파일 둘이 같은 폴더에 동시에 쓴다 */
let installing = false
const changeListeners = new Set<(status: UpdateStatus) => void>()

function getUpdateSnapshot(): UpdateSnapshot {
  return { currentVersion: app.getVersion(), status }
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

function setStatus(next: UpdateStatus): void {
  status = next
  broadcast(IPC.updateStatusChanged, getUpdateSnapshot(), ['main'])
  for (const listener of changeListeners) listener(status)
}

export function onUpdateStatusChange(listener: (status: UpdateStatus) => void): void {
  changeListeners.add(listener)
}

/** 받는 중이거나 받아 둔 새 버전이 있으면 다시 확인하지 않는다 */
async function checkForUpdates(): Promise<void> {
  if (!['idle', 'up-to-date', 'error'].includes(status.state)) return
  setStatus({ state: 'checking' })
  const result = await autoUpdater.checkForUpdates().catch(() => null)
  // 받기 실패는 'error' 이벤트로 처리 — 처리하지 않은 거부로 남기지 않는다
  void result?.downloadPromise?.catch(() => undefined)
  // 실패는 'error' 이벤트로 오지만 업데이터가 비활성이면 이벤트 없이 끝난다
  if (status.state === 'checking') setStatus({ state: 'error' })
}

export function installUpdate(): void {
  if (status.state !== 'ready' || installing) return
  installing = true
  // 조용히 설치하고 다시 실행 — 설치 마법사를 다시 거치지 않는다
  autoUpdater.quitAndInstall(true, true)
}

function listenUpdater(): void {
  autoUpdater.on('update-available', ({ version }) => {
    setStatus({ state: 'downloading', version, percent: 0 })
  })
  autoUpdater.on('update-not-available', () => {
    setStatus({ state: 'up-to-date', checkedAt: Date.now() })
  })
  autoUpdater.on('download-progress', ({ percent }) => {
    if (status.state !== 'downloading') return
    // 진행 이벤트가 잦아 1% 단위로만 알린다
    const rounded = Math.floor(percent)
    if (rounded !== status.percent) setStatus({ ...status, percent: rounded })
  })
  autoUpdater.on('update-downloaded', ({ version }) => {
    setStatus({ state: 'ready', version })
    sayToPet(`새 버전이 준비됐어요 (v${version}) — 트레이 메뉴에서 업데이트할 수 있어요`)
  })
  autoUpdater.on('error', (error) => {
    console.error('[update] failed:', error.message)
    setStatus({ state: 'error' })
  })
}

export function registerUpdateIpc(): void {
  const options = { allow: ['main'] as const, payload: z.undefined() }
  handle(IPC.updateGetStatus, options, getUpdateSnapshot)
  handle(IPC.updateCheck, options, checkForUpdates)
  handle(IPC.updateInstall, options, installUpdate)
}

export function startUpdater(): void {
  if (status.state === 'dev') return
  autoUpdater.disableWebInstaller = true
  listenUpdater()
  setTimeout(() => void checkForUpdates(), FIRST_CHECK_DELAY_MS)
  setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL_MS)
}
