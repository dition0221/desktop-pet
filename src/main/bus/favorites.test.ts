import { reorderFavorites } from '@main/bus/favorites'
import type { BusFavorite, BusFavoriteKey } from '@preload/api'
import { describe, expect, it } from 'vitest'

function favorite(stopId: string, routeId: string | null = null): BusFavorite {
  return {
    stop: { id: stopId, name: stopId, number: null, lat: 36.35, lng: 127.38 },
    route: routeId === null ? null : { id: routeId, number: routeId },
    alert: false
  }
}

const keyOf = (item: BusFavorite): BusFavoriteKey => ({
  stopId: item.stop.id,
  routeId: item.route?.id ?? null
})

describe('reorderFavorites', () => {
  const stopA = favorite('DJB1')
  const routeA = favorite('DJB1', 'DJB30')
  const stopB = favorite('DJB2')

  it('키 순서대로 다시 놓는다', () => {
    const order = [stopB, stopA, routeA].map(keyOf)
    expect(reorderFavorites([stopA, routeA, stopB], order)).toEqual([stopB, stopA, routeA])
  })

  it('같은 정류소의 정류소 즐겨찾기와 노선 즐겨찾기를 구분한다', () => {
    const order = [routeA, stopA].map(keyOf)
    expect(reorderFavorites([stopA, routeA], order)).toEqual([routeA, stopA])
  })

  it('목록에 없는 즐겨찾기는 원래 순서대로 뒤에 붙인다', () => {
    expect(reorderFavorites([stopA, routeA, stopB], [keyOf(stopB)])).toEqual([stopB, stopA, routeA])
  })

  it('없는 키는 무시하고 같은 키가 겹쳐도 한 번만 놓는다', () => {
    const order = [keyOf(favorite('DJB9')), keyOf(stopB), keyOf(stopB)]
    expect(reorderFavorites([stopA, stopB], order)).toEqual([stopB, stopA])
  })
})
