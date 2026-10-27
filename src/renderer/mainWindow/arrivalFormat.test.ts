import type { BusArrival, BusFavorite } from '@preload/api'
import { arrivalLabel, favoriteArrivals } from '@renderer/mainWindow/arrivalFormat'
import { describe, expect, it } from 'vitest'

function arrival(routeId: string, secondsLeft: number): BusArrival {
  return { routeId, routeNumber: routeId, routeType: null, secondsLeft, stopsLeft: 2 }
}

const STOP = { id: 'DJB8001413', name: '대전역', number: '12460', lat: 36.33, lng: 127.43 }

describe('arrivalLabel', () => {
  it('받은 뒤 흐른 시간을 빼고 분 단위로 보여 준다', () => {
    expect(arrivalLabel(arrival('A', 300), 0, 0)).toBe('5분')
    expect(arrivalLabel(arrival('A', 300), 0, 90_000)).toBe('3분')
  })

  it('1분 이하로 남으면 곧 도착', () => {
    expect(arrivalLabel(arrival('A', 70), 0, 20_000)).toBe('곧 도착')
    expect(arrivalLabel(arrival('A', 10), 0, 60_000)).toBe('곧 도착')
  })

  it('예정 시각이 1분 넘게 지났으면 지나간 버스로 본다', () => {
    expect(arrivalLabel(arrival('A', 10), 0, 75_000)).toBeNull()
    expect(arrivalLabel(arrival('A', 600), 0, 30 * 60_000)).toBeNull()
  })
})

describe('favoriteArrivals', () => {
  const stop = { arrivals: [arrival('A', 60), arrival('B', 120)], updatedAt: 0, error: null }

  it('정류소 즐겨찾기는 모든 노선을 보여 준다', () => {
    const favorite: BusFavorite = { stop: STOP, route: null }
    expect(favoriteArrivals(favorite, stop)).toHaveLength(2)
  })

  it('노선 즐겨찾기는 그 노선만 보여 준다', () => {
    const favorite: BusFavorite = { stop: STOP, route: { id: 'B', number: 'B' } }
    expect(favoriteArrivals(favorite, stop).map((a) => a.routeId)).toEqual(['B'])
  })

  it('아직 조회 전이면 빈 목록', () => {
    expect(favoriteArrivals({ stop: STOP, route: null }, undefined)).toEqual([])
  })
})
