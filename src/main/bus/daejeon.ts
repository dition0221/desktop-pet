import { gatewayError, TagoError } from '@main/bus/tago'
import type { BusArrival } from '@preload/api'
import { z } from 'zod'

/** 대전시 버스정보시스템 원본 — TAGO는 이 값을 30초쯤 늦게 중계한다(2026-10-28 실측) */
export const DAEJEON_ARRIVAL_URL = 'https://apis.data.go.kr/6300000/arrive/getArrInfoByStopID'

/** 이보다 오래된 위치 정보는 멈춘 차량 — 도착 예정 시간이 실제와 동떨어진다 */
const STALE_INFO_MS = 5 * 60_000
/** 실측에서 갱신이 끊긴 차량에만 붙던 상태 코드 */
const STALE_MESSAGE_TYPE = '07'
const SUCCESS_CODE = '0'
const NO_RESULT_CODE = '4'

/** 노선 유형 코드 — TAGO 노선 정보와 맞춰 실측으로 확인한 것만, 나머지는 표시하지 않는다 */
const ROUTE_TYPES: Record<string, string> = {
  '1': '급행버스',
  '2': '간선버스',
  '4': '외곽버스'
}

const XML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'"
}

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (entity, name: string) => {
    if (name.startsWith('#x')) return String.fromCodePoint(Number.parseInt(name.slice(2), 16))
    if (name.startsWith('#')) return String.fromCodePoint(Number(name.slice(1)))
    return XML_ENTITIES[name] ?? entity
  })
}

/** 중첩 없는 `<태그>값</태그>` 목록만 오는 응답이라 정규식으로 충분하다 */
function fieldsOf(xml: string): Record<string, string> {
  return Object.fromEntries(
    [...xml.matchAll(/<(\w+)>([^<]*)<\/\1>/g)].map(([, name, value]) => [
      name,
      decodeEntities(value).trim()
    ])
  )
}

/** `2026-10-28 06:40:28` — 대전시 서버도 앱도 한국 시간이라 로컬 시각으로 읽는다 */
function parseInfoTime(text: string | undefined): number | null {
  const match = text?.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, year, month, day, hour, minute, second] = match.map(Number)
  return new Date(year, month - 1, day, hour, minute, second).getTime()
}

/** coerce는 빈 문자열을 0으로 바꿈 — "곧 도착"·"0정류장 전"으로 잘못 보이지 않게 먼저 걷어낸다 */
function blankToUndefined(value: unknown): unknown {
  return value === '' ? undefined : value
}

const itemSchema = z.object({
  ROUTE_CD: z.string().regex(/^\d{1,12}$/),
  ROUTE_NO: z.string().min(1).max(16),
  ROUTE_TP: z.string().optional(),
  EXTIME_SEC: z.preprocess(blankToUndefined, z.coerce.number().min(0)),
  STATUS_POS: z.preprocess(blankToUndefined, z.coerce.number().min(0).optional()),
  CAR_REG_NO: z.string().max(32).optional(),
  DESTINATION: z.string().max(64).optional(),
  MSG_TP: z.string().optional(),
  INFO_OFFER_TM: z.string().optional()
})

function toArrival(item: z.output<typeof itemSchema>): BusArrival {
  return {
    // TAGO 노선 ID와 같은 번호 체계 — 즐겨찾기 노선과 맞춰 본다
    routeId: `DJB${item.ROUTE_CD}`,
    routeNumber: item.ROUTE_NO,
    routeType: ROUTE_TYPES[item.ROUTE_TP ?? ''] ?? null,
    secondsLeft: item.EXTIME_SEC,
    stopsLeft: item.STATUS_POS ?? null,
    vehicleId: item.CAR_REG_NO || null,
    destination: item.DESTINATION || null
  }
}

function isFresh(item: z.output<typeof itemSchema>, now: number): boolean {
  if (item.MSG_TP === STALE_MESSAGE_TYPE) return false
  const infoAt = parseInfoTime(item.INFO_OFFER_TM)
  return infoAt === null || now - infoAt < STALE_INFO_MS
}

/** 결과가 없으면 headerCd 4 — 오류가 아니라 빈 목록이다. 형식이 다르거나 멈춘 차량은 버린다 */
export function parseDaejeonArrivals(text: string, now: number): BusArrival[] {
  const gateway = gatewayError(text)
  if (gateway) throw gateway
  const header = fieldsOf(text.match(/<msgHeader>([\s\S]*?)<\/msgHeader>/)?.[1] ?? '')
  if (header.headerCd === NO_RESULT_CODE) return []
  if (header.headerCd !== SUCCESS_CODE) {
    throw new TagoError(
      `daejeon-${header.headerCd ?? 'unknown'}`,
      header.headerMsg ?? text.slice(0, 200)
    )
  }

  return [...text.matchAll(/<itemList>([\s\S]*?)<\/itemList>/g)].flatMap(([, xml]) => {
    const parsed = itemSchema.safeParse(fieldsOf(xml))
    return parsed.success && isFresh(parsed.data, now) ? [toArrival(parsed.data)] : []
  })
}
