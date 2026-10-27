import { handle } from '@main/ipc'
import { showMainWindow } from '@main/mainWindow'
import { forEachOverlay, onOverlaysSynced, setOverlaysIgnoreMouse } from '@main/overlayWindows'
import { toPetSprite } from '@main/pack/library'
import type { PackManifest } from '@main/pack/schema'
import {
  type Lane,
  type MotionConfig,
  type MotionPlan,
  nextPlan,
  positionAt,
  startActivity
} from '@main/pet/motion'
import { isPetVisible, setPetVisible } from '@main/pet/visibility'
import type { PetMotion, PetSprite } from '@preload/api'
import { IPC } from '@preload/channels'
import {
  BrowserWindow,
  Menu,
  type Point,
  powerMonitor,
  type Rectangle,
  type Size,
  screen
} from 'electron'
import { z } from 'zod'

/** 팩을 못 읽었을 때 임시 사각형 크기 */
const FALLBACK_SIZE: Size = { width: 64, height: 64 }
const HOVER_POLL_MS = 50
const FIRST_IDLE_MS = 1000
const MOTION_CONFIG: MotionConfig = {
  walkSpeed: 0.06,
  walkMs: [4000, 9000],
  idleMs: [1500, 4000]
}

/** 펫이 다니는 주 모니터 작업 영역 (전역 DIP) */
let area: Rectangle
let sprite: PetSprite | null
let size: Size
let plan: MotionPlan
let segmentTimer: NodeJS.Timeout | undefined
let cursorOverPet = false

function laneOf(rect: Rectangle): Lane {
  return { minX: rect.x, maxX: rect.x + rect.width - size.width }
}

function floorOf(rect: Rectangle): number {
  return rect.y + rect.height - size.height
}

function toOverlayMotion(bounds: Rectangle): PetMotion {
  const lane = laneOf(area)
  return {
    activity: plan.activity,
    direction: plan.direction,
    ...size,
    y: floorOf(area) - bounds.y,
    startX: plan.startX - bounds.x,
    minX: lane.minX - bounds.x,
    maxX: lane.maxX - bounds.x,
    velocity: plan.velocity,
    startedAt: plan.startedAt
  }
}

function schedule(next: MotionPlan): void {
  plan = next
  clearTimeout(segmentTimer)
  segmentTimer = setTimeout(
    () => schedule(nextPlan(plan, laneOf(area), Date.now(), Math.random, MOTION_CONFIG)),
    Math.max(0, plan.segmentEndsAt - Date.now())
  )
  forEachOverlay((window) =>
    window.webContents.send(IPC.petMotionChanged, toOverlayMotion(window.getBounds()))
  )
}

function isSameRect(a: Rectangle, b: Rectangle): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

function syncWithOverlays(): void {
  // 새로 만든 오버레이는 클릭 통과로 시작 — 다음 폴링이 hover를 다시 적용하게 리셋
  cursorOverPet = false
  setOverlaysIgnoreMouse(true)

  const workArea = screen.getPrimaryDisplay().workArea
  if (isSameRect(workArea, area)) return
  const now = Date.now()
  const x = positionAt(plan, laneOf(area), now)
  area = workArea
  const remainingMs = Math.max(0, plan.activityEndsAt - now)
  schedule(
    startActivity(plan.activity, x, plan.direction, laneOf(area), now, remainingMs, MOTION_CONFIG)
  )
}

function isOverPet(point: Point, now: number): boolean {
  const x = positionAt(plan, laneOf(area), now)
  const y = floorOf(area)
  return point.x >= x && point.x < x + size.width && point.y >= y && point.y < y + size.height
}

function pollCursor(): void {
  const over = isPetVisible() && isOverPet(screen.getCursorScreenPoint(), Date.now())
  if (over === cursorOverPet) return
  cursorOverPet = over
  setOverlaysIgnoreMouse(!over)
}

function showPetMenu(window: BrowserWindow | null): void {
  Menu.buildFromTemplate([
    { label: '메인 창 열기', click: showMainWindow },
    { label: '펫 숨기기', click: () => setPetVisible(false) }
  ]).popup(window ? { window } : undefined)
}

function registerPetIpc(): void {
  handle(IPC.petGetSprite, { allow: ['overlay'], payload: z.undefined() }, () => sprite)
  handle(IPC.petGetMotion, { allow: ['overlay'], payload: z.undefined() }, (_, event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return window ? toOverlayMotion(window.getBounds()) : null
  })
  handle(IPC.petOpenMainWindow, { allow: ['overlay'], payload: z.undefined() }, showMainWindow)
  handle(IPC.petShowContextMenu, { allow: ['overlay'], payload: z.undefined() }, (_, event) =>
    showPetMenu(BrowserWindow.fromWebContents(event.sender))
  )
}

export function startPet(pack: PackManifest | null): void {
  sprite = pack && toPetSprite(pack)
  size = sprite
    ? { width: sprite.frameWidth * sprite.scale, height: sprite.frameHeight * sprite.scale }
    : FALLBACK_SIZE
  area = screen.getPrimaryDisplay().workArea
  const lane = laneOf(area)
  const center = (lane.minX + lane.maxX) / 2
  schedule(startActivity('idle', center, 1, lane, Date.now(), FIRST_IDLE_MS, MOTION_CONFIG))

  registerPetIpc()
  onOverlaysSynced(syncWithOverlays)
  // 절전 시간은 타이머에 잡히지 않을 수 있음 — 시계 기준으로 다시 예약
  powerMonitor.on('resume', () => schedule(plan))
  setInterval(pollCursor, HOVER_POLL_MS)
}
