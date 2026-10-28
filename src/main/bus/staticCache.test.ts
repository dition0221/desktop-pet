import { createStaticCache, STATIC_CACHE_LIMIT, STATIC_CACHE_TTL_MS } from '@main/bus/staticCache'
import { afterEach, describe, expect, it, vi } from 'vitest'

const isEmptyList = (items: unknown[]): boolean => items.length === 0

describe('createStaticCache', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('유효 기간 안에는 다시 불러오지 않고 지나면 다시 불러온다', async () => {
    vi.useFakeTimers()
    const cache = createStaticCache<string[]>(isEmptyList)
    const load = vi.fn(async () => ['a'])
    await cache('k', load)
    vi.advanceTimersByTime(STATIC_CACHE_TTL_MS - 1)
    await cache('k', load)
    expect(load).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    await cache('k', load)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('빈 결과와 실패는 저장하지 않는다', async () => {
    const cache = createStaticCache<string[]>(isEmptyList)
    const empty = vi.fn(async () => [])
    await cache('k', empty)
    await cache('k', empty)
    expect(empty).toHaveBeenCalledTimes(2)

    await expect(cache('e', () => Promise.reject(new Error('down')))).rejects.toThrow('down')
    const load = vi.fn(async () => ['a'])
    await cache('e', load)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('한도를 넘으면 가장 먼저 저장한 항목부터 버린다', async () => {
    const cache = createStaticCache<string[]>(isEmptyList)
    for (let i = 0; i < STATIC_CACHE_LIMIT; i++) await cache(String(i), async () => ['v'])
    await cache('new', async () => ['v'])
    const first = vi.fn(async () => ['v'])
    const second = vi.fn(async () => ['v'])
    await cache('1', second)
    await cache('0', first)
    expect(second).not.toHaveBeenCalled()
    expect(first).toHaveBeenCalledTimes(1)
  })
})
