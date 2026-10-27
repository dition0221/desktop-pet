import { alertText, findDueAlerts, type SentAlert } from '@main/bus/alerts'
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
import { onSecretChange } from '@main/store/secrets'
import { getSettings, onSettingsChange } from '@main/store/settings'
import type { ArrivalPollStatus, ArrivalsSnapshot, BusErrorCode } from '@preload/api'
import { IPC } from '@preload/channels'

/** 대전시 도착정보 개발계정은 일 10,000건 — 키 테스트 몫을 남긴다 */
const DAILY_ARRIVAL_BUDGET = 8000
/** 다시 불러도 낫지 않는 오류 — 키를 바꿀 때까지 멈춘다 */
const KEY_ERRORS: ReadonlySet<BusErrorCode> = new Set(['no-key', 'invalid-key', 'not-allowed'])

let snapshot: ArrivalsSnapshot = { status: 'idle', stops: {}, nextPollAt: null }
let timer: NodeJS.Timeout | undefined
let lastPolledAt = 0
let failures = 0
let quotaBlockedUntil = 0
let keyBlocked = false
let polling = false
let sentAlerts: SentAlert[] = []

/** 메인 창이 보이면 모든 즐겨찾기, 닫혀 있으면 알림을 켠 즐겨찾기만 */
function watchedStopIds(): string[] {
  const visible = isMainWindowVisible()
  const favorites = getSettings().busFavorites.filter((favorite) => visible || favorite.alert)
  return [...new Set(favorites.map((favorite) => favorite.stop.id))]
}

function announceDueAlerts(): void {
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

function publish(status: ArrivalPollStatus, nextPollAt: number | null): void {
  snapshot = { ...snapshot, status, nextPollAt }
  broadcast(IPC.busArrivalsChanged, snapshot, ['main'])
}

function waitThen(status: ArrivalPollStatus, delayMs: number, action: () => void): void {
  timer = setTimeout(action, delayMs)
  publish(status, Date.now() + delayMs)
}

/** 운행 시간이 끝났거나 한도로 멈추면 지나간 도착 예정이 남지 않게 비운다 */
function clearArrivals(): void {
  snapshot = { ...snapshot, stops: {} }
}

/** 즐겨찾기·설정·키·창 표시 상태가 바뀔 때마다 다음 할 일을 다시 정한다 */
function schedule(): void {
  clearTimeout(timer)
  const stopIds = watchedStopIds()
  // 지켜보지 않는 정류소 결과는 버린다 — 다시 지켜보면 새 정류소로 보고 바로 조회한다
  snapshot = {
    ...snapshot,
    stops: Object.fromEntries(
      Object.entries(snapshot.stops).filter(([stopId]) => stopIds.includes(stopId))
    )
  }

  const now = Date.now()
  if (stopIds.length === 0) {
    const noFavorites = isMainWindowVisible() && getSettings().busFavorites.length === 0
    publish(noFavorites ? 'no-favorites' : 'idle', null)
  } else if (keyBlocked) publish('key-error', null)
  else if (quotaBlockedUntil > now) {
    clearArrivals()
    waitThen('quota-exceeded', quotaBlockedUntil - now, schedule)
  } else scheduleNextPoll(stopIds, now)
}

function scheduleNextPoll(stopIds: string[], now: number): void {
  const { busPoll } = getSettings()
  const untilActive = msUntilActive(new Date(now), busPoll.activeHours)
  if (untilActive > 0) {
    clearArrivals()
    waitThen('outside-hours', untilActive, schedule)
    return
  }

  const normalMs = pollIntervalMs({
    stopCount: stopIds.length,
    preferredMs: busPoll.intervalSec * 1000,
    hours: busPoll.activeHours,
    dailyBudget: DAILY_ARRIVAL_BUDGET
  })
  const intervalMs = failures > 0 ? backoffMs(failures, normalMs) : normalMs
  const status = failures > 0 ? 'backoff' : 'polling'

  // 새로 추가된 정류소만 바로 부르고, 전체 주기는 그대로 둔다
  const newStopIds = stopIds.filter((stopId) => !(stopId in snapshot.stops))
  if (newStopIds.length > 0 && lastPolledAt > 0) {
    waitThen(status, 0, () => void poll(newStopIds))
    return
  }
  const dueInMs = Math.max(0, lastPolledAt + intervalMs - now)
  waitThen(status, dueInMs, () => void poll(stopIds))
}

async function poll(stopIds: string[]): Promise<void> {
  // 타이머를 잡은 뒤 운행 시간이 끝났거나 지켜볼 정류소가 바뀌었으면 다시 정한다
  const { activeHours } = getSettings().busPoll
  const watched = watchedStopIds()
  const stillWatched = stopIds.every((stopId) => watched.includes(stopId))
  if (polling || !stillWatched || !isWithinActiveHours(new Date(), activeHours)) {
    if (!polling) schedule()
    return
  }

  polling = true
  const isFullCycle = stopIds.length === watched.length
  try {
    const results = await Promise.all(
      stopIds.map(async (stopId) => [stopId, await stopArrivals(stopId)] as const)
    )
    const finishedAt = Date.now()
    if (isFullCycle) lastPolledAt = finishedAt
    const stops = { ...snapshot.stops }
    for (const [stopId, result] of results) {
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
  onSettingsChange(schedule)
  onSecretChange((id) => {
    if (id !== 'busServiceKey') return
    keyBlocked = false
    failures = 0
    lastPolledAt = 0
    schedule()
  })
  schedule()
}
