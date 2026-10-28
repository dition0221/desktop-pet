/** 정류소·노선은 자주 바뀌지 않음 — 지도를 오가며 같은 조회를 반복하지 않되 상주 앱이라 하루 뒤엔 다시 받는다 */
export const STATIC_CACHE_TTL_MS = 24 * 60 * 60 * 1000
export const STATIC_CACHE_LIMIT = 200

interface CacheEntry<T> {
  value: T
  savedAt: number
}

/** 빈 결과는 일시적 누락일 수 있어 캐시하지 않는다 */
export function createStaticCache<T>(
  isEmpty: (value: T) => boolean
): (key: string, load: () => Promise<T>) => Promise<T> {
  const entries = new Map<string, CacheEntry<T>>()
  return async (key, load) => {
    const hit = entries.get(key)
    if (hit && Date.now() - hit.savedAt < STATIC_CACHE_TTL_MS) return hit.value

    const value = await load()
    if (isEmpty(value)) return value
    entries.delete(key)
    if (entries.size >= STATIC_CACHE_LIMIT) entries.delete(entries.keys().next().value as string)
    entries.set(key, { value, savedAt: Date.now() })
    return value
  }
}
