import type { BusFavorite, BusFavoriteKey } from '@preload/api'

export function isSameFavorite(
  favorite: BusFavorite,
  { stopId, routeId }: BusFavoriteKey
): boolean {
  return favorite.stop.id === stopId && (favorite.route?.id ?? null) === routeId
}

/** 순서를 고르는 사이 추가된 즐겨찾기를 잃지 않게 — 목록에 없는 것은 원래 순서대로 뒤에 붙인다 */
export function reorderFavorites(favorites: BusFavorite[], order: BusFavoriteKey[]): BusFavorite[] {
  const picked = new Set<BusFavorite>()
  for (const key of order) {
    const favorite = favorites.find((item) => !picked.has(item) && isSameFavorite(item, key))
    if (favorite) picked.add(favorite)
  }
  return [...picked, ...favorites.filter((favorite) => !picked.has(favorite))]
}
