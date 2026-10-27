import {
  type MotionConfig,
  type MotionPlan,
  nextPlan,
  positionAt,
  startActivity
} from '@main/pet/motion'
import { describe, expect, it } from 'vitest'

const LANE = { minX: 0, maxX: 1000 }
const CONFIG: MotionConfig = { walkSpeed: 0.1, walkMs: [5000, 5000], idleMs: [2000, 2000] }
const half = (): number => 0.5

describe('startActivity', () => {
  it('걷기는 벽에 닿는 시점과 활동 종료 중 먼저 오는 때 구간이 끝난다', () => {
    const toWall = startActivity('walking', 900, 1, LANE, 0, 5000, CONFIG)
    expect(toWall.segmentEndsAt).toBe(1000)
    expect(toWall.activityEndsAt).toBe(5000)

    const toEnd = startActivity('walking', 100, 1, LANE, 0, 5000, CONFIG)
    expect(toEnd.segmentEndsAt).toBe(5000)
  })

  it('레인 밖 시작 위치는 레인 안으로 맞춘다', () => {
    expect(startActivity('idle', 1500, 1, LANE, 0, 1000, CONFIG).startX).toBe(1000)
    expect(startActivity('idle', -20, 1, LANE, 0, 1000, CONFIG).startX).toBe(0)
  })

  it('레인이 펫보다 좁으면 걷지 않고 대기한다', () => {
    const plan = startActivity('walking', 0, 1, { minX: 0, maxX: 0 }, 0, 5000, CONFIG)
    expect(plan.activity).toBe('idle')
    expect(plan.segmentEndsAt).toBe(5000)
  })
})

describe('positionAt', () => {
  it('구간 시작부터 등속으로 이동하고 레인 밖으로 나가지 않는다', () => {
    const plan = startActivity('walking', 900, 1, LANE, 0, 5000, CONFIG)
    expect(positionAt(plan, LANE, 500)).toBe(950)
    expect(positionAt(plan, LANE, 1500)).toBe(1000)
  })

  it('대기 중에는 움직이지 않는다', () => {
    const plan = startActivity('idle', 300, -1, LANE, 0, 2000, CONFIG)
    expect(positionAt(plan, LANE, 1500)).toBe(300)
  })
})

describe('nextPlan', () => {
  it('걷는 중 벽에 닿으면 방향만 바꾸고 활동 종료 시각은 유지한다', () => {
    const plan = startActivity('walking', 900, 1, LANE, 0, 5000, CONFIG)
    const next = nextPlan(plan, LANE, plan.segmentEndsAt, half, CONFIG)
    expect(next.activity).toBe('walking')
    expect(next.direction).toBe(-1)
    expect(next.startX).toBe(1000)
    expect(next.activityEndsAt).toBe(5000)
    expect(next.segmentEndsAt).toBe(5000)
  })

  it('걷기가 끝나면 그 자리에서 대기한다', () => {
    const plan = startActivity('walking', 100, 1, LANE, 0, 5000, CONFIG)
    const next = nextPlan(plan, LANE, 5000, half, CONFIG)
    expect(next.activity).toBe('idle')
    expect(next.startX).toBe(600)
    expect(next.segmentEndsAt).toBe(7000)
  })

  it('타이머가 일찍·늦게 발화해도 활동이 끝난 걷기는 같은 방향으로 대기한다', () => {
    const plan = startActivity('walking', 100, 1, LANE, 0, 5000, CONFIG)
    for (const now of [4999.2, 5030]) {
      expect(nextPlan(plan, LANE, now, half, CONFIG)).toMatchObject({
        activity: 'idle',
        direction: 1,
        startX: 600
      })
    }
  })

  it('대기가 끝나면 다시 걷고, 벽에 붙어 있으면 반대쪽으로 출발한다', () => {
    const atLeft = startActivity('idle', 0, -1, LANE, 0, 2000, CONFIG)
    expect(nextPlan(atLeft, LANE, 2000, half, CONFIG)).toMatchObject({
      activity: 'walking',
      direction: 1
    })

    const atRight = startActivity('idle', 1000, 1, LANE, 0, 2000, CONFIG)
    expect(nextPlan(atRight, LANE, 2000, () => 0.9, CONFIG).direction).toBe(-1)
  })

  it('걷기와 대기를 반복해도 레인 밖으로 나가지 않는다', () => {
    let plan: MotionPlan = startActivity('walking', 500, 1, LANE, 0, 5000, CONFIG)
    let random = 0.37
    const nextRandom = (): number => {
      random = (random * 9301 + 0.49297) % 1
      return random
    }
    for (let step = 0; step < 200; step++) {
      expect(plan.segmentEndsAt).toBeGreaterThanOrEqual(plan.startedAt)
      expect(plan.startX).toBeGreaterThanOrEqual(LANE.minX)
      expect(plan.startX).toBeLessThanOrEqual(LANE.maxX)
      plan = nextPlan(plan, LANE, plan.segmentEndsAt, nextRandom, CONFIG)
    }
  })
})
