import { gatewayError, PortalError } from '@main/bus/portal'
import type { BusArrival } from '@preload/api'
import { z } from 'zod'

/** 대전시 버스정보시스템 원본 — TAGO는 이 값을 30초쯤 늦게 중계한다(2026-10-28 실측) */
export const DAEJEON_ARRIVAL_URL = 'https://apis.data.go.kr/6300000/arrive/getArrInfoByStopID'

/** 이보다 오래된 위치 정보는 멈춘 차량 — 실측에서 정상 항목은 2분 안이었다 */
const STALE_INFO_MS = 5 * 60_000
/** 실측에서 갱신이 끊긴 차량에만 붙던 상태 코드 */
const STALE_MESSAGE_TYPE = '07'
const SUCCESS_CODE = '0'
const NO_RESULT_CODE = '4'
const KST_OFFSET_HOURS = 9
const MAX_CODE_POINT = 0x10ffff

const XML_ENTITIES = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"]
])

/** 잘못된 문자 참조는 그대로 둔다 — 한 항목 때문에 응답 전체가 실패하지 않게 */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return XML_ENTITIES.get(name) ?? entity
    const isHex = name[1].toLowerCase() === 'x'
    const codePoint = isHex ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1))
    return Number.isInteger(codePoint) && codePoint <= MAX_CODE_POINT
      ? String.fromCodePoint(codePoint)
      : entity
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

/** 닫는 태그가 없는 응답에서도 선형 시간에 끝나게 정규식 대신 문자열로 자른다 */
function blocksOf(xml: string, tag: string): string[] {
  const close = `</${tag}>`
  return xml
    .split(`<${tag}>`)
    .slice(1)
    .flatMap((part) => {
      const end = part.indexOf(close)
      return end < 0 ? [] : [part.slice(0, end)]
    })
}

/** `2026-10-28 06:40:28` — 대전시 서버의 한국 시각, PC 시간대와 상관없이 읽는다 */
function parseInfoTime(text: string | undefined): number | null {
  const match = text?.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, year, month, day, hour, minute, second] = match.map(Number)
  return Date.UTC(year, month - 1, day, hour - KST_OFFSET_HOURS, minute, second)
}

/** coerce는 빈 문자열을 0으로 바꿈 — "곧 도착"·"0정류장 전"으로 잘못 보이지 않게 먼저 걷어낸다 */
function blankToUndefined(value: unknown): unknown {
  return value === '' ? undefined : value
}

const itemSchema = z.object({
  ROUTE_CD: z.string().regex(/^\d{1,12}$/),
  ROUTE_NO: z.string().min(1).max(16),
  EXTIME_SEC: z.preprocess(blankToUndefined, z.coerce.number().min(0)),
  STATUS_POS: z.preprocess(blankToUndefined, z.coerce.number().min(0).optional()),
  CAR_REG_NO: z.string().max(32).optional(),
  DESTINATION: z.string().max(64).optional(),
  MSG_TP: z.string().optional(),
  INFO_OFFER_TM: z.string().optional()
})

type Item = z.output<typeof itemSchema>

/** `EXTIME_SEC`는 정보 시각 기준(실측) — PC 시계가 아닌 서버 시각까지 흐른 만큼 빼고, 멈춘 차량은 버린다 */
function toArrival(item: Item, serverNow: number): BusArrival | null {
  if (item.MSG_TP === STALE_MESSAGE_TYPE) return null
  const infoAt = parseInfoTime(item.INFO_OFFER_TM)
  const ageMs = infoAt === null ? 0 : Math.max(0, serverNow - infoAt)
  if (ageMs >= STALE_INFO_MS) return null
  return {
    // TAGO 노선 ID와 같은 번호 체계 — 즐겨찾기 노선과 맞춰 본다
    routeId: `DJB${item.ROUTE_CD}`,
    routeNumber: item.ROUTE_NO,
    secondsLeft: Math.max(0, item.EXTIME_SEC - ageMs / 1000),
    stopsLeft: item.STATUS_POS ?? null,
    vehicleId: item.CAR_REG_NO || null,
    destination: item.DESTINATION || null
  }
}

/** 결과가 없으면 headerCd 4 — 오류가 아니라 빈 목록이다. 형식이 다르거나 멈춘 차량은 버린다 */
export function parseDaejeonArrivals(text: string, serverNow: number | null): BusArrival[] {
  const gateway = gatewayError(text)
  if (gateway) throw gateway
  const header = fieldsOf(blocksOf(text, 'msgHeader')[0] ?? '')
  if (header.headerCd === NO_RESULT_CODE) return []
  if (header.headerCd !== SUCCESS_CODE) {
    const code = `daejeon-${header.headerCd ?? 'unknown'}`
    throw new PortalError(code, header.headerMsg ?? text.slice(0, 200))
  }

  const items = blocksOf(text, 'itemList').flatMap((xml) => {
    const parsed = itemSchema.safeParse(fieldsOf(xml))
    return parsed.success ? [parsed.data] : []
  })
  // 서버 시각을 못 받았으면 응답에서 가장 최근 정보 시각을 기준으로 삼는다
  const infoTimes = items.flatMap((item) => parseInfoTime(item.INFO_OFFER_TM) ?? [])
  const reference = serverNow ?? (infoTimes.length > 0 ? Math.max(...infoTimes) : 0)
  return items.flatMap((item) => toArrival(item, reference) ?? [])
}
