import { arrayMove } from '@dnd-kit/sortable'
import type { BusFavorite } from '@preload/api'
import { useState } from 'react'

/** 드래그 항목 id이자 React key */
export function favoriteId(favorite: BusFavorite): string {
  return `${favorite.stop.id}:${favorite.route?.id ?? ''}`
}

/** 메인이 저장해 settings로 다시 보내기 전까지 옮긴 순서를 먼저 보여 준다 */
export function useFavoriteOrder(favorites: BusFavorite[]): {
  items: BusFavorite[]
  move(activeId: string, overId: string): void
} {
  const [moved, setMoved] = useState<{ base: BusFavorite[]; items: BusFavorite[] } | null>(null)
  const items = moved?.base === favorites ? moved.items : favorites

  const move = (activeId: string, overId: string): void => {
    const from = items.findIndex((favorite) => favoriteId(favorite) === activeId)
    const to = items.findIndex((favorite) => favoriteId(favorite) === overId)
    if (from === -1 || to === -1 || from === to) return
    const next = arrayMove(items, from, to)
    setMoved({ base: favorites, items: next })
    void window.api.bus.reorderFavorites(
      next.map((favorite) => ({ stopId: favorite.stop.id, routeId: favorite.route?.id ?? null }))
    )
  }

  return { items, move }
}
