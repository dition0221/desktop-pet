import {
  activeMinutes,
  backoffMs,
  isWithinActiveHours,
  msUntilActive,
  msUntilMidnight,
  pollIntervalMs
} from '@main/bus/pollPlan'
import { describe, expect, it } from 'vitest'

const DAYTIME = { start: '05:30', end: '23:30' }
const OVERNIGHT = { start: '22:00', end: '02:00' }

function at(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(2026, 9, 28, hours, minutes, 0, 0)
}

describe('활성 시간', () => {
  it('시작은 포함하고 끝은 포함하지 않는다', () => {
    expect(isWithinActiveHours(at('05:30'), DAYTIME)).toBe(true)
    expect(isWithinActiveHours(at('23:29'), DAYTIME)).toBe(true)
    expect(isWithinActiveHours(at('23:30'), DAYTIME)).toBe(false)
    expect(isWithinActiveHours(at('03:00'), DAYTIME)).toBe(false)
  })

  it('자정을 넘는 구간도 처리한다', () => {
    expect(isWithinActiveHours(at('23:00'), OVERNIGHT)).toBe(true)
    expect(isWithinActiveHours(at('01:59'), OVERNIGHT)).toBe(true)
    expect(isWithinActiveHours(at('12:00'), OVERNIGHT)).toBe(false)
    expect(activeMinutes(OVERNIGHT)).toBe(240)
  })

  it('다음 활성 시작까지 남은 시간을 잰다', () => {
    expect(msUntilActive(at('04:30'), DAYTIME)).toBe(60 * 60_000)
    expect(msUntilActive(at('23:30'), DAYTIME)).toBe(6 * 60 * 60_000)
    expect(msUntilActive(at('12:00'), DAYTIME)).toBe(0)
  })

  it('자정까지 남은 시간을 잰다', () => {
    expect(msUntilMidnight(at('23:00'))).toBe(60 * 60_000)
  })
})

describe('pollIntervalMs', () => {
  it('정류소가 적으면 원하는 간격을 그대로 쓴다', () => {
    const interval = pollIntervalMs({
      stopCount: 2,
      preferredMs: 60_000,
      hours: DAYTIME,
      dailyBudget: 8000
    })
    expect(interval).toBe(60_000)
  })

  it('정류소가 많으면 하루 예산을 넘지 않게 간격을 늘린다', () => {
    const options = { stopCount: 20, preferredMs: 30_000, hours: DAYTIME, dailyBudget: 8000 }
    const interval = pollIntervalMs(options)
    const callsPerDay = ((activeMinutes(DAYTIME) * 60_000) / interval) * options.stopCount
    expect(interval).toBeGreaterThan(30_000)
    expect(callsPerDay).toBeLessThanOrEqual(options.dailyBudget)
  })
})

describe('backoffMs', () => {
  it('실패할수록 두 배로 늘리고 10분에서 멈춘다', () => {
    expect(backoffMs(1, 30_000)).toBe(30_000)
    expect(backoffMs(2, 30_000)).toBe(60_000)
    expect(backoffMs(10, 30_000)).toBe(10 * 60_000)
  })

  it('정상 간격보다 짧아지지 않는다', () => {
    expect(backoffMs(1, 162_000)).toBe(162_000)
    expect(backoffMs(3, 15 * 60_000)).toBe(15 * 60_000)
  })
})

describe('하루 종일', () => {
  const ALL_DAY = { start: '00:00', end: '00:00' }

  it('시작과 끝이 같으면 언제나 활성이다', () => {
    expect(isWithinActiveHours(at('03:00'), ALL_DAY)).toBe(true)
    expect(msUntilActive(at('23:59'), ALL_DAY)).toBe(0)
    expect(activeMinutes(ALL_DAY)).toBe(24 * 60)
  })
})
