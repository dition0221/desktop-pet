import type { BusPollSettings } from '@preload/api'
import { z } from 'zod'

export type ActiveHours = BusPollSettings['activeHours']

/** 대전 시내버스 첫차·막차 무렵 */
export const DEFAULT_BUS_POLL: BusPollSettings = {
  intervalSec: 60,
  activeHours: { start: '05:30', end: '23:30' },
  alertMinutes: 5
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const MINUTES_PER_DAY = 24 * 60
const MAX_BACKOFF_MS = 10 * 60 * 1000

/** 시작과 끝이 같으면 하루 종일 */
export const busPollSettingsSchema = z.object({
  intervalSec: z.union([z.literal(30), z.literal(60), z.literal(120), z.literal(300)]),
  activeHours: z.object({
    start: z.string().regex(TIME_PATTERN),
    end: z.string().regex(TIME_PATTERN)
  }),
  alertMinutes: z
    .union([z.literal(3), z.literal(5), z.literal(10), z.literal(15)])
    .default(DEFAULT_BUS_POLL.alertMinutes)
}) satisfies z.ZodType<BusPollSettings>

export function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minuteOfDate(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function isAllDay(hours: ActiveHours): boolean {
  return hours.start === hours.end
}

export function activeMinutes(hours: ActiveHours): number {
  const span = minutesOfDay(hours.end) - minutesOfDay(hours.start)
  return span > 0 ? span : span + MINUTES_PER_DAY
}

export function isWithinActiveHours(date: Date, hours: ActiveHours): boolean {
  if (isAllDay(hours)) return true
  const minute = minuteOfDate(date)
  const start = minutesOfDay(hours.start)
  const end = minutesOfDay(hours.end)
  return start < end ? minute >= start && minute < end : minute >= start || minute < end
}

/** 활성 시간이 시작될 때까지 — 이미 활성 시간이면 0 */
export function msUntilActive(date: Date, hours: ActiveHours): number {
  if (isWithinActiveHours(date, hours)) return 0
  const minutesLeft =
    (minutesOfDay(hours.start) - minuteOfDate(date) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  return minutesLeft * 60_000 - date.getSeconds() * 1000 - date.getMilliseconds()
}

/** 다음 날 0시까지 — 일일 호출 한도는 날짜가 바뀌면 다시 찬다 */
export function msUntilMidnight(date: Date): number {
  const midnight = new Date(date)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime() - date.getTime()
}

/** 활성 시간 내내 정류소마다 한 번씩 돌아도 하루 예산을 넘지 않게 간격을 늘린다 */
export function pollIntervalMs(options: {
  stopCount: number
  preferredMs: number
  hours: ActiveHours
  dailyBudget: number
}): number {
  const { stopCount, preferredMs, hours, dailyBudget } = options
  if (stopCount === 0) return preferredMs
  const cyclesPerDay = dailyBudget / stopCount
  return Math.max(preferredMs, Math.ceil((activeMinutes(hours) * 60_000) / cyclesPerDay))
}

/** 기준은 예산을 반영한 정상 간격 — 실패했다고 정상보다 자주 부르지 않는다 */
export function backoffMs(failures: number, normalMs: number): number {
  const grown = normalMs * 2 ** Math.max(0, failures - 1)
  return Math.max(normalMs, Math.min(grown, MAX_BACKOFF_MS))
}
