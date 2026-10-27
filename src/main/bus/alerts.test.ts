import { alertText, findDueAlerts, nextAlertCheckAt, type SentAlert } from '@main/bus/alerts'
import type { BusArrival, BusFavorite, StopArrivals } from '@preload/api'
import { describe, expect, it } from 'vitest'

const STOP = { id: 'DJB8001413', name: '대전역', number: '12460', lat: 36.33, lng: 127.43 }
const ROUTE_612 = { id: 'DJB30300076', number: '612' }
const FAVORITE: BusFavorite = { stop: STOP, route: ROUTE_612, alert: true }
const MINUTE = 60_000

function arrival(
  secondsLeft: number,
  routeId = ROUTE_612.id,
  vehicleId: string | null = null
): BusArrival {
  return {
    routeId,
    routeNumber: '612',
    routeType: null,
    secondsLeft,
    stopsLeft: 3,
    vehicleId,
    destination: null
  }
}

/** 조회한 시각(now)에 받은 응답이라고 보고 판정한다 */
function check(options: {
  arrivals: BusArrival[]
  now?: number
  favorites?: BusFavorite[]
  sent?: SentAlert[]
}) {
  const now = options.now ?? 0
  const stops: Record<string, StopArrivals> = {
    [STOP.id]: { arrivals: options.arrivals, updatedAt: now, error: null }
  }
  const input = {
    favorites: options.favorites ?? [FAVORITE],
    stops,
    now,
    alertMinutes: 5,
    sent: options.sent ?? []
  }
  return { ...findDueAlerts(input), nextCheckAt: nextAlertCheckAt(input) }
}

describe('findDueAlerts', () => {
  it('N분 안으로 들어온 가장 가까운 버스를 알린다', () => {
    const result = check({ arrivals: [arrival(600), arrival(240)] })
    expect(result.due.map((alert) => alert.expectedAt)).toEqual([4 * MINUTE])
  })

  it('N분보다 먼 버스는 아직 알리지 않는다', () => {
    expect(check({ arrivals: [arrival(400)] }).due).toEqual([])
  })

  it('예정 시각이 조금 흔들려도 같은 버스는 한 번만 알린다', () => {
    const first = check({ arrivals: [arrival(240)] })
    const second = check({ arrivals: [arrival(200)], now: MINUTE, sent: first.sent })
    expect(second.due).toEqual([])
  })

  it('"곧 도착"이 여러 번 이어져 예정 시각이 계속 밀려도 다시 알리지 않는다', () => {
    let sent = check({ arrivals: [arrival(30)] }).sent
    for (let poll = 1; poll <= 6; poll++) {
      const result = check({ arrivals: [arrival(30)], now: poll * MINUTE, sent })
      expect(result.due).toEqual([])
      sent = result.sent
    }
  })

  it('차량 번호가 있으면 붙어 오는 다른 차량도 따로 알리고, 같은 차량은 다시 알리지 않는다', () => {
    const first = check({ arrivals: [arrival(240, ROUTE_612.id, '대전75자1111')] })
    const sameCar = check({
      arrivals: [arrival(500, ROUTE_612.id, '대전75자1111')],
      now: MINUTE,
      sent: first.sent
    })
    expect(sameCar.due).toEqual([])
    const nextCar = check({
      arrivals: [arrival(200, ROUTE_612.id, '대전75자2222')],
      now: 5 * MINUTE,
      sent: first.sent
    })
    expect(nextCar.due).toHaveLength(1)
  })

  it('다음 버스는 다시 알린다', () => {
    const first = check({ arrivals: [arrival(240)] })
    const next = check({ arrivals: [arrival(200)], now: 10 * MINUTE, sent: first.sent })
    expect(next.due).toHaveLength(1)
  })

  it('알림을 끈 즐겨찾기와 정류소 즐겨찾기, 다른 노선은 무시한다', () => {
    const arrivals = [arrival(120), arrival(60, 'DJB30300002')]
    expect(check({ favorites: [{ ...FAVORITE, alert: false }], arrivals }).due).toEqual([])
    expect(check({ favorites: [{ ...FAVORITE, route: null }], arrivals }).due).toEqual([])
    expect(check({ arrivals }).due.map((alert) => alert.arrival.routeId)).toEqual([ROUTE_612.id])
  })

  it('오래된 알림 기록은 정리한다', () => {
    const sent = [{ stopId: STOP.id, routeId: ROUTE_612.id, vehicleId: null, expectedAt: 0 }]
    expect(check({ arrivals: [], now: 60 * MINUTE, sent }).sent).toEqual([])
  })
})

describe('nextAlertCheckAt', () => {
  it('다음 조회 전에 N분 안으로 들어올 시각을 알려 준다', () => {
    expect(check({ arrivals: [arrival(8 * 60)] }).nextCheckAt).toBe(3 * MINUTE)
  })

  it('알리지 않은 버스가 이미 N분 안이면 지금 판정한다', () => {
    const settings = { favorites: [FAVORITE], now: MINUTE, alertMinutes: 5, sent: [] }
    const stops = { [STOP.id]: { arrivals: [arrival(240)], updatedAt: 0, error: null } }
    expect(nextAlertCheckAt({ ...settings, stops })).toBe(MINUTE)
  })

  it('이미 알렸거나 다가올 버스가 없으면 null', () => {
    const first = check({ arrivals: [arrival(240)] })
    expect(check({ arrivals: [arrival(240)], sent: first.sent }).nextCheckAt).toBeNull()
    expect(check({ arrivals: [] }).nextCheckAt).toBeNull()
  })
})

describe('alertText', () => {
  it('노선·남은 시간·정류소를 말한다', () => {
    const [alert] = check({ arrivals: [arrival(240)] }).due
    expect(alertText(alert, 0)).toBe('612번 버스가 4분 뒤 대전역에 도착해요')
    expect(alertText(alert, 200_000)).toBe('612번 버스가 곧 대전역에 도착해요')
  })
})
