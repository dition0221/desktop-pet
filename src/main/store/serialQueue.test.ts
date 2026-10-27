import { createSerialQueue } from '@main/store/serialQueue'
import { describe, expect, it } from 'vitest'

describe('createSerialQueue', () => {
  it('앞 작업이 끝난 뒤에 다음 작업을 시작한다', async () => {
    const enqueue = createSerialQueue()
    const order: string[] = []
    const slow = enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      order.push('slow')
    })
    const fast = enqueue(async () => {
      order.push('fast')
    })
    await Promise.all([slow, fast])
    expect(order).toEqual(['slow', 'fast'])
  })

  it('실패한 작업은 그 호출만 실패하고 다음 작업은 실행된다', async () => {
    const enqueue = createSerialQueue()
    const failed = enqueue(() => Promise.reject(new Error('boom')))
    const next = enqueue(() => Promise.resolve('ok'))
    await expect(failed).rejects.toThrow('boom')
    await expect(next).resolves.toBe('ok')
  })
})
