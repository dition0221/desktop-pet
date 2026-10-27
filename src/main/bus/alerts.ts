import type { BusArrival, BusFavorite, StopArrivals } from '@preload/api'

/** 차량 번호가 없을 때 — 응답마다 예정 시각이 조금씩 흔들려 이 안이면 같은 버스로 본다 */
const SAME_BUS_WINDOW_MS = 3 * 60_000
/** 예정 시각이 이만큼 지난 알림 기록은 버린다 */
const SENT_ALERT_TTL_MS = 15 * 60_000

export interface DueAlert {
  favorite: BusFavorite
  arrival: BusArrival
  expectedAt: number
}

export interface SentAlert {
  stopId: string
  routeId: string
  /** 차량 번호를 알면 몇 분 차이로 붙어 오는 같은 노선 버스도 따로 알린다 */
  vehicleId: string | null
  expectedAt: number
}

interface NextBus {
  favorite: BusFavorite
  routeId: string
  arrival: BusArrival
  expectedAt: number
}

/** 알림을 켠 노선 즐겨찾기마다 아직 오지 않은 가장 가까운 버스 */
function nextBuses(
  favorites: BusFavorite[],
  stops: Record<string, StopArrivals>,
  now: number
): NextBus[] {
  return favorites.flatMap((favorite) => {
    const route = favorite.route
    const stop = stops[favorite.stop.id]
    const updatedAt = stop?.updatedAt ?? null
    if (!favorite.alert || !route || !stop || updatedAt === null) return []

    const next = stop.arrivals
      .filter((arrival) => arrival.routeId === route.id)
      .map((arrival) => ({ arrival, expectedAt: updatedAt + arrival.secondsLeft * 1000 }))
      .filter(({ expectedAt }) => expectedAt > now)
      .sort((a, b) => a.expectedAt - b.expectedAt)[0]
    return next ? [{ favorite, routeId: route.id, ...next }] : []
  })
}

function isSameBus(alert: SentAlert, bus: NextBus): boolean {
  if (alert.stopId !== bus.favorite.stop.id || alert.routeId !== bus.routeId) return false
  if (alert.vehicleId && bus.arrival.vehicleId) return alert.vehicleId === bus.arrival.vehicleId
  return Math.abs(alert.expectedAt - bus.expectedAt) < SAME_BUS_WINDOW_MS
}

function findSent(sent: SentAlert[], bus: NextBus): SentAlert | undefined {
  return sent.find((alert) => isSameBus(alert, bus))
}

/** N분 안으로 들어온 버스를 한 번만 알린다 — 이미 알린 버스는 최신 예측으로 기록을 옮겨 흔들림이 쌓이지 않게 한다 */
export function findDueAlerts(options: {
  favorites: BusFavorite[]
  stops: Record<string, StopArrivals>
  now: number
  alertMinutes: number
  sent: SentAlert[]
}): { due: DueAlert[]; sent: SentAlert[] } {
  const { favorites, stops, now, alertMinutes } = options
  const sent = options.sent
    .filter((alert) => alert.expectedAt + SENT_ALERT_TTL_MS > now)
    .map((alert) => ({ ...alert }))
  const due: DueAlert[] = []

  for (const bus of nextBuses(favorites, stops, now)) {
    const record = findSent(sent, bus)
    if (record) {
      record.expectedAt = bus.expectedAt
      continue
    }
    if (bus.expectedAt - now > alertMinutes * 60_000) continue
    due.push({ favorite: bus.favorite, arrival: bus.arrival, expectedAt: bus.expectedAt })
    sent.push({
      stopId: bus.favorite.stop.id,
      routeId: bus.routeId,
      vehicleId: bus.arrival.vehicleId,
      expectedAt: bus.expectedAt
    })
  }
  return { due, sent }
}

/** 아직 알리지 않은 버스가 N분 안으로 들어오는 가장 이른 시각 — 이미 들어와 있으면 지금(알림을 막 켠 경우) */
export function nextAlertCheckAt(options: {
  favorites: BusFavorite[]
  stops: Record<string, StopArrivals>
  now: number
  alertMinutes: number
  sent: SentAlert[]
}): number | null {
  const { favorites, stops, now, alertMinutes, sent } = options
  const times = nextBuses(favorites, stops, now)
    .filter((bus) => !findSent(sent, bus))
    .map((bus) => Math.max(now, bus.expectedAt - alertMinutes * 60_000))
  return times.length > 0 ? Math.min(...times) : null
}

export function alertText({ favorite, arrival, expectedAt }: DueAlert, now: number): string {
  const minutes = Math.ceil((expectedAt - now) / 60_000)
  const when = minutes <= 1 ? '곧' : `${minutes}분 뒤`
  return `${arrival.routeNumber}번 버스가 ${when} ${favorite.stop.name}에 도착해요`
}
