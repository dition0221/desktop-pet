import type { BusArrival, BusFavorite, StopArrivals } from '@preload/api'

/** 응답마다 예정 시각이 조금씩 흔들림 — 이 안이면 같은 버스로 보고 다시 알리지 않는다 */
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
  expectedAt: number
}

function isAlreadySent(
  sent: SentAlert[],
  stopId: string,
  routeId: string,
  expectedAt: number
): boolean {
  return sent.some(
    (alert) =>
      alert.stopId === stopId &&
      alert.routeId === routeId &&
      Math.abs(alert.expectedAt - expectedAt) < SAME_BUS_WINDOW_MS
  )
}

/** 알림을 켠 노선 즐겨찾기마다 가장 먼저 오는 버스가 N분 안에 들어오면 한 번만 알린다 */
export function findDueAlerts(options: {
  favorites: BusFavorite[]
  stops: Record<string, StopArrivals>
  now: number
  alertMinutes: number
  sent: SentAlert[]
}): { due: DueAlert[]; sent: SentAlert[] } {
  const { favorites, stops, now, alertMinutes } = options
  const sent = options.sent.filter((alert) => alert.expectedAt + SENT_ALERT_TTL_MS > now)
  const due: DueAlert[] = []

  for (const favorite of favorites) {
    const route = favorite.route
    const stop = stops[favorite.stop.id]
    const updatedAt = stop?.updatedAt ?? null
    if (!favorite.alert || !route || !stop || updatedAt === null) continue

    const next = stop.arrivals
      .filter((arrival) => arrival.routeId === route.id)
      .map((arrival) => ({ arrival, expectedAt: updatedAt + arrival.secondsLeft * 1000 }))
      .filter(({ expectedAt }) => expectedAt > now)
      .sort((a, b) => a.expectedAt - b.expectedAt)[0]
    if (!next || next.expectedAt - now > alertMinutes * 60_000) continue
    if (isAlreadySent(sent, favorite.stop.id, route.id, next.expectedAt)) continue

    due.push({ favorite, ...next })
    sent.push({ stopId: favorite.stop.id, routeId: route.id, expectedAt: next.expectedAt })
  }
  return { due, sent }
}

export function alertText({ favorite, arrival, expectedAt }: DueAlert, now: number): string {
  const minutes = Math.ceil((expectedAt - now) / 60_000)
  const when = minutes <= 1 ? '곧' : `${minutes}분 뒤`
  return `${arrival.routeNumber}번 버스가 ${when} ${favorite.stop.name}에 도착해요`
}
