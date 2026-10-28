export type Activity = 'walking' | 'idle'
export type Direction = 1 | -1

/** 펫 왼쪽 끝이 움직일 수 있는 x 범위 (전역 DIP) */
export interface Lane {
  minX: number
  maxX: number
}

/** 한 구간 동안은 등속 — 렌더러는 이 값만으로 위치를 보간한다 */
export interface MotionPlan {
  activity: Activity
  direction: Direction
  startX: number
  startedAt: number
  /** px/ms, 방향 포함 */
  velocity: number
  segmentEndsAt: number
  activityEndsAt: number
}

export interface MotionConfig {
  walkSpeed: number
  walkMs: readonly [number, number]
  idleMs: readonly [number, number]
}

export type Random = () => number

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function randomBetween([min, max]: readonly [number, number], random: Random): number {
  return min + (max - min) * random()
}

export function positionAt(plan: MotionPlan, lane: Lane, now: number): number {
  return clamp(plan.startX + plan.velocity * (now - plan.startedAt), lane.minX, lane.maxX)
}

function idlePlan(x: number, direction: Direction, now: number, durationMs: number): MotionPlan {
  const endsAt = now + durationMs
  return {
    activity: 'idle',
    direction,
    startX: x,
    startedAt: now,
    velocity: 0,
    segmentEndsAt: endsAt,
    activityEndsAt: endsAt
  }
}

function walkPlan(
  x: number,
  direction: Direction,
  lane: Lane,
  now: number,
  activityEndsAt: number,
  config: MotionConfig
): MotionPlan {
  const distanceToEdge = direction === 1 ? lane.maxX - x : x - lane.minX
  // 레인이 펫보다 좁으면 걸을 곳이 없음 — 0ms 구간이 무한 반복되지 않게 대기로
  if (lane.maxX - lane.minX < 1) return idlePlan(x, direction, now, activityEndsAt - now)
  return {
    activity: 'walking',
    direction,
    startX: x,
    startedAt: now,
    velocity: direction * config.walkSpeed,
    segmentEndsAt: Math.min(activityEndsAt, now + distanceToEdge / config.walkSpeed),
    activityEndsAt
  }
}

export function startActivity(
  activity: Activity,
  x: number,
  direction: Direction,
  lane: Lane,
  now: number,
  durationMs: number,
  config: MotionConfig
): MotionPlan {
  const clampedX = clamp(x, lane.minX, lane.maxX)
  return activity === 'walking'
    ? walkPlan(clampedX, direction, lane, now, now + durationMs, config)
    : idlePlan(clampedX, direction, now, durationMs)
}

function directionAwayFromEdge(x: number, lane: Lane, random: Random): Direction {
  if (x <= lane.minX) return 1
  if (x >= lane.maxX) return -1
  return random() < 0.5 ? -1 : 1
}

/** 구간이 끝났을 때 호출 — 벽에서 끝난 걷기는 방향만 바꾸고, 활동이 끝났으면 걷기·대기를 바꾼다 */
export function nextPlan(
  plan: MotionPlan,
  lane: Lane,
  now: number,
  random: Random,
  config: MotionConfig
): MotionPlan {
  // 타이머는 예정보다 일찍·늦게 발화할 수 있음 — now가 아니라 구간 구성으로 판정
  const x = positionAt(plan, lane, plan.segmentEndsAt)
  const hitWall = plan.activity === 'walking' && plan.segmentEndsAt < plan.activityEndsAt

  if (hitWall) {
    const flipped: Direction = plan.direction === 1 ? -1 : 1
    return walkPlan(x, flipped, lane, now, plan.activityEndsAt, config)
  }

  if (plan.activity === 'walking') {
    return idlePlan(x, plan.direction, now, randomBetween(config.idleMs, random))
  }

  const direction = directionAwayFromEdge(x, lane, random)
  return walkPlan(x, direction, lane, now, now + randomBetween(config.walkMs, random), config)
}
