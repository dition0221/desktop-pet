import { alertText, findDueAlerts, nextAlertCheckAt, type SentAlert } from '@main/bus/alerts'
import { stopArrivals } from '@main/bus/client'
import {
  backoffMs,
  isWithinActiveHours,
  msUntilActive,
  msUntilMidnight,
  pollIntervalMs
} from '@main/bus/pollPlan'
import { broadcast } from '@main/ipc'
import { isMainWindowVisible, onMainWindowVisibilityChange } from '@main/mainWindow'
import { sayToPet } from '@main/pet/speech'
import { isPetVisible, onPetVisibleChange } from '@main/pet/visibility'
import { onSecretChange } from '@main/store/secrets'
import { getSettings, onSettingsChange } from '@main/store/settings'
import type { ArrivalPollStatus, ArrivalsSnapshot, BusErrorCode } from '@preload/api'
import { IPC } from '@preload/channels'

/** 대전시 도착정보 개발계정은 일 10,000건 — 키 테스트 몫을 남긴다 */
const DAILY_ARRIVAL_BUDGET = 8000
/** 다시 불러도 낫지 않는 오류 — 키를 바꿀 때까지 멈춘다 */
const KEY_ERRORS: ReadonlySet<BusErrorCode> = new Set(['no-key', 'invalid-key', 'not-allowed'])

let snapshot: ArrivalsSnapshot = { status: 'idle', stops: {}, nextPollAt: null }
let pollTimer: NodeJS.Timeout | undefined
let alertTimer: NodeJS.Timeout | undefined
/** 정류소마다 마지막으로 조회한 시각 — 창을 닫았다 열거나 즐겨찾기를 더해도 정류소별로 주기를 지킨다 */
const lastAttemptAt = new Map<string, number>()
let failures = 0
let quotaBlockedUntil = 0
let keyBlocked = false
let polling = false
let sentAlerts: SentAlert[] = []

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

/** 메인 창이 보이면 모든 즐겨찾기, 닫혀 있으면 펫이 알려 줄 수 있을 때만 알림을 켠 노선 즐겨찾기 */
function watchedStopIds(): string[] {
  const { busFavorites } = getSettings()
  if (isMainWindowVisible()) return unique(busFavorites.map((favorite) => favorite.stop.id))
  if (!isPetVisible()) return []
  const alerting = busFavorites.filter((favorite) => favorite.alert && favorite.route)
  return unique(alerting.map((favorite) => favorite.stop.id))
}

function currentIntervalMs(stopCount: number): number {
  const { busPoll } = getSettings()
  const normalMs = pollIntervalMs({
    stopCount,
    preferredMs: busPoll.intervalSec * 1000,
    hours: busPoll.activeHours,
    dailyBudget: DAILY_ARRIVAL_BUDGET
  })
  return failures > 0 ? backoffMs(failures, normalMs) : normalMs
}

function publish(status: ArrivalPollStatus, nextPollAt: number | null): void {
  snapshot = { ...snapshot, status, nextPollAt }
  broadcast(IPC.busArrivalsChanged, snapshot, ['main'])
}

function waitThen(status: ArrivalPollStatus, delayMs: number, action: () => void): void {
  pollTimer = setTimeout(action, delayMs)
  publish(status, Date.now() + delayMs)
}

/** 운행 시간이 끝났거나 한도로 멈추면 지나간 도착 예정이 남지 않게 비운다 */
function clearArrivals(): void {
  snapshot = { ...snapshot, stops: {} }
  lastAttemptAt.clear()
}

function announceDueAlerts(): void {
  if (!isPetVisible()) return
  const { busFavorites, busPoll } = getSettings()
  const now = Date.now()
  const { due, sent } = findDueAlerts({
    favorites: busFavorites,
    stops: snapshot.stops,
    now,
    alertMinutes: busPoll.alertMinutes,
    sent: sentAlerts
  })
  sentAlerts = sent
  for (const alert of due) sayToPet(alertText(alert, now))
}

/** 조회 간격이 알림 시점보다 길어도 놓치지 않게, 마지막 예측으로 N분 전이 되는 때에 다시 판정한다 */
function scheduleAlertCheck(): void {
  clearTimeout(alertTimer)
  // 펫이 숨어 있으면 알리지 않으므로 "지금 판정"이 끝없이 반복되지 않게 펫이 다시 보일 때 정한다
  if (!isPetVisible()) return
  const { busFavorites, busPoll } = getSettings()
  const now = Date.now()
  const checkAt = nextAlertCheckAt({
    favorites: busFavorites,
    stops: snapshot.stops,
    now,
    alertMinutes: busPoll.alertMinutes,
    sent: sentAlerts
  })
  if (checkAt === null) return
  alertTimer = setTimeout(() => {
    announceDueAlerts()
    scheduleAlertCheck()
  }, checkAt - now)
}

/** 즐겨찾기·설정·키·창과 펫 표시 상태가 바뀔 때마다 다음 할 일을 다시 정한다 */
function schedule(): void {
  clearTimeout(pollTimer)
  const favoriteIds = new Set(getSettings().busFavorites.map((favorite) => favorite.stop.id))
  snapshot = {
    ...snapshot,
    stops: Object.fromEntries(
      Object.entries(snapshot.stops).filter(([stopId]) => favoriteIds.has(stopId))
    )
  }
  for (const stopId of lastAttemptAt.keys()) {
    if (!favoriteIds.has(stopId)) lastAttemptAt.delete(stopId)
  }

  const stopIds = watchedStopIds()
  const now = Date.now()
  if (stopIds.length === 0) {
    publish(isMainWindowVisible() && favoriteIds.size === 0 ? 'no-favorites' : 'idle', null)
  } else if (keyBlocked) publish('key-error', null)
  else if (quotaBlockedUntil > now) {
    clearArrivals()
    waitThen('quota-exceeded', quotaBlockedUntil - now, schedule)
  } else scheduleNextPoll(stopIds, now)
  scheduleAlertCheck()
}

function scheduleNextPoll(stopIds: string[], now: number): void {
  const untilActive = msUntilActive(new Date(now), getSettings().busPoll.activeHours)
  if (untilActive > 0) {
    clearArrivals()
    waitThen('outside-hours', untilActive, schedule)
    return
  }
  const intervalMs = currentIntervalMs(stopIds.length)
  const nextDueAt = Math.min(...stopIds.map((id) => (lastAttemptAt.get(id) ?? 0) + intervalMs))
  waitThen(failures > 0 ? 'backoff' : 'polling', Math.max(0, nextDueAt - now), () => void poll())
}

async function poll(): Promise<void> {
  if (polling) return
  const now = Date.now()
  const stopIds = watchedStopIds()
  const intervalMs = currentIntervalMs(stopIds.length)
  const dueIds = stopIds.filter((id) => (lastAttemptAt.get(id) ?? 0) + intervalMs <= now)
  // 타이머를 잡은 뒤 운행 시간이 끝났거나 지켜볼 정류소가 바뀌었으면 다시 정한다
  if (
    dueIds.length === 0 ||
    !isWithinActiveHours(new Date(now), getSettings().busPoll.activeHours)
  ) {
    schedule()
    return
  }

  polling = true
  try {
    const results = await Promise.all(
      dueIds.map(async (stopId) => [stopId, await stopArrivals(stopId)] as const)
    )
    const finishedAt = Date.now()
    const stops = { ...snapshot.stops }
    for (const [stopId, result] of results) {
      lastAttemptAt.set(stopId, finishedAt)
      if (result.ok) {
        stops[stopId] = { arrivals: result.data, updatedAt: finishedAt, error: null }
        continue
      }
      // 일시적 실패면 지난 결과를 남겨 화면이 비지 않게 한다
      const previous = stops[stopId]
      stops[stopId] = {
        arrivals: previous?.arrivals ?? [],
        updatedAt: previous?.updatedAt ?? null,
        error: result.error
      }
      if (result.error === 'quota-exceeded') {
        quotaBlockedUntil = finishedAt + msUntilMidnight(new Date(finishedAt))
      }
      if (KEY_ERRORS.has(result.error)) keyBlocked = true
    }
    snapshot = { ...snapshot, stops }
    failures = results.every(([, result]) => !result.ok) ? failures + 1 : 0
    announceDueAlerts()
  } finally {
    polling = false
    schedule()
  }
}

export function getArrivals(): ArrivalsSnapshot {
  return snapshot
}

export function startArrivalPoller(): void {
  onMainWindowVisibilityChange(schedule)
  onPetVisibleChange(schedule)
  onSettingsChange(schedule)
  onSecretChange((id) => {
    if (id !== 'busServiceKey') return
    keyBlocked = false
    failures = 0
    lastAttemptAt.clear()
    schedule()
  })
  schedule()
}
