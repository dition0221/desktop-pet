import { alertText, findDueAlerts, type SentAlert } from '@main/bus/alerts'
import type { BusArrival, BusFavorite, StopArrivals } from '@preload/api'
import { describe, expect, it } from 'vitest'

const STOP = { id: 'DJB8001413', name: '대전역', number: '12460', lat: 36.33, lng: 127.43 }
const ROUTE_612 = { id: 'DJB30300076', number: '612' }
const FAVORITE: BusFavorite = { stop: STOP, route: ROUTE_612, alert: true }

function arrival(routeId: string, secondsLeft: number): BusArrival {
  return { routeId, routeNumber: '612', routeType: null, secondsLeft, stopsLeft: 3 }
}

function stops(arrivals: BusArrival[], updatedAt = 0): Record<string, StopArrivals> {
  return { [STOP.id]: { arrivals, updatedAt, error: null } }
}

function due(options: {
  favorites?: BusFavorite[]
  arrivals: BusArrival[]
  now?: number
  sent?: SentAlert[]
}) {
  return findDueAlerts({
    favorites: options.favorites ?? [FAVORITE],
    stops: stops(options.arrivals),
    now: options.now ?? 0,
    alertMinutes: 5,
    sent: options.sent ?? []
  })
}

describe('findDueAlerts', () => {
  it('N분 안으로 들어온 가장 가까운 버스를 알린다', () => {
    const result = due({ arrivals: [arrival(ROUTE_612.id, 600), arrival(ROUTE_612.id, 240)] })
    expect(result.due.map((alert) => alert.expectedAt)).toEqual([240_000])
  })

  it('N분보다 멀거나 이미 지나간 버스는 알리지 않는다', () => {
    expect(due({ arrivals: [arrival(ROUTE_612.id, 400)] }).due).toEqual([])
    expect(due({ arrivals: [arrival(ROUTE_612.id, 60)], now: 90_000 }).due).toEqual([])
  })

  it('예정 시각이 조금 흔들려도 같은 버스는 한 번만 알린다', () => {
    const first = due({ arrivals: [arrival(ROUTE_612.id, 240)] })
    const second = due({ arrivals: [arrival(ROUTE_612.id, 200)], now: 60_000, sent: first.sent })
    expect(second.due).toEqual([])
  })

  it('다음 버스는 다시 알린다', () => {
    const first = due({ arrivals: [arrival(ROUTE_612.id, 240)] })
    const next = due({ arrivals: [arrival(ROUTE_612.id, 900)], now: 700_000, sent: first.sent })
    expect(next.due).toHaveLength(1)
  })

  it('알림을 끈 즐겨찾기와 정류소 즐겨찾기, 다른 노선은 무시한다', () => {
    const arrivals = [arrival(ROUTE_612.id, 120), arrival('DJB30300002', 60)]
    expect(due({ favorites: [{ ...FAVORITE, alert: false }], arrivals }).due).toEqual([])
    expect(due({ favorites: [{ ...FAVORITE, route: null }], arrivals }).due).toEqual([])
    expect(due({ arrivals }).due.map((alert) => alert.arrival.routeId)).toEqual([ROUTE_612.id])
  })

  it('오래된 알림 기록은 정리한다', () => {
    const sent = [{ stopId: STOP.id, routeId: ROUTE_612.id, expectedAt: 0 }]
    expect(due({ arrivals: [], now: 60 * 60_000, sent }).sent).toEqual([])
  })
})

describe('alertText', () => {
  it('노선·남은 시간·정류소를 말한다', () => {
    const [alert] = due({ arrivals: [arrival(ROUTE_612.id, 240)] }).due
    expect(alertText(alert, 0)).toBe('612번 버스가 4분 뒤 대전역에 도착해요')
    expect(alertText(alert, 200_000)).toBe('612번 버스가 곧 대전역에 도착해요')
  })
})
