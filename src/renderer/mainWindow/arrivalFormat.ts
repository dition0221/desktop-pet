import type { BusArrival, BusFavorite, StopArrivals } from '@preload/api'

const ARRIVING_SOON_SEC = 60
/** 예정 시각이 이만큼 지났으면 이미 지나간 버스로 보고 숨긴다 */
const PASSED_SEC = -60

/** 남은 시간은 응답을 받은 시각 기준 — 지금까지 흐른 시간을 뺀다. 지나간 버스면 null */
export function arrivalLabel(arrival: BusArrival, updatedAt: number, now: number): string | null {
  const secondsLeft = arrival.secondsLeft - (now - updatedAt) / 1000
  if (secondsLeft < PASSED_SEC) return null
  if (secondsLeft <= ARRIVING_SOON_SEC) return '곧 도착'
  return `${Math.floor(secondsLeft / 60)}분`
}

export function favoriteArrivals(
  favorite: BusFavorite,
  stop: StopArrivals | undefined
): BusArrival[] {
  const arrivals = stop?.arrivals ?? []
  return favorite.route
    ? arrivals.filter((arrival) => arrival.routeId === favorite.route?.id)
    : arrivals
}
