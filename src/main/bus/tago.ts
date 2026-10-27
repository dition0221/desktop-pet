import type { BusErrorCode, BusFavorite, BusRoute, BusRouteStop, BusStop } from '@preload/api'
import { z } from 'zod'

export const DAEJEON_CITY_CODE = 25

/** TAGO 정류소·노선 ID — 대전은 `DJB` + 숫자 */
export const TAGO_ID_PATTERN = /^DJB\d{1,12}$/

/** 공공데이터포털 게이트웨이는 `_type=json`이어도 인증 오류를 XML로 돌려준다 */
const GATEWAY_REASON_PATTERN = /<returnReasonCode>(\d+)<\/returnReasonCode>/
const GATEWAY_MESSAGE_PATTERN = /<returnAuthMsg>([^<]*)<\/returnAuthMsg>/
const PERCENT_ENCODED_PATTERN = /%[0-9a-f]{2}/i

const GATEWAY_ERROR_CODES: Record<string, BusErrorCode> = {
  '20': 'not-allowed',
  '22': 'quota-exceeded',
  '30': 'invalid-key',
  '31': 'invalid-key'
}

export class TagoError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message)
  }
}

/** 매핑에 없는 코드는 원인을 찾을 수 있게 호출부가 로그를 남긴다 */
export function isKnownTagoError(error: TagoError): boolean {
  return error.code in GATEWAY_ERROR_CODES
}

export function toBusErrorCode(error: unknown): BusErrorCode {
  return error instanceof TagoError ? (GATEWAY_ERROR_CODES[error.code] ?? 'unknown') : 'unknown'
}

/** 로그·에러에 키가 남지 않게 — URL 파라미터와 원문 모두 가린다 */
export function maskServiceKey(text: string, key: string): string {
  const masked = text.replace(/serviceKey=[^&\s"']+/gi, 'serviceKey=***')
  return key ? masked.replaceAll(key, '***').replaceAll(encodeURIComponent(key), '***') : masked
}

/** 포털의 Encoding 키를 붙여 넣으면 URLSearchParams가 한 번 더 인코딩해 인증에 실패한다 */
export function normalizeServiceKey(key: string): string {
  if (!PERCENT_ENCODED_PATTERN.test(key)) return key
  try {
    return decodeURIComponent(key)
  } catch {
    return key
  }
}

const envelopeSchema = z.object({
  response: z.object({
    header: z.object({ resultCode: z.coerce.string(), resultMsg: z.string() }),
    body: z
      .object({
        items: z.union([z.literal(''), z.object({ item: z.unknown() })]).optional(),
        totalCount: z.coerce.number().optional()
      })
      .optional()
  })
})

export interface TagoPage<T> {
  items: T[]
  /** 조건에 맞는 전체 건수 — 받은 항목 수보다 크면 잘린 것 */
  totalCount: number
}

/** 결과가 없으면 `items`가 빈 문자열, 한 건이면 배열이 아니라 객체로 온다 — 형식이 다른 항목은 버린다 */
export function parseTagoPage<T>(text: string, itemSchema: z.ZodType<T>): TagoPage<T> {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    const reason = text.match(GATEWAY_REASON_PATTERN)?.[1] ?? 'non-json'
    throw new TagoError(reason, text.match(GATEWAY_MESSAGE_PATTERN)?.[1] ?? text.slice(0, 200))
  }

  const envelope = envelopeSchema.safeParse(json)
  if (!envelope.success) throw new TagoError('invalid-response', envelope.error.message)
  const { header, body } = envelope.data.response
  if (header.resultCode !== '00') throw new TagoError(header.resultCode, header.resultMsg)
  if (!body?.items) return { items: [], totalCount: 0 }

  const { item } = body.items
  const list = Array.isArray(item) ? item : [item]
  const items = list.flatMap((entry) => {
    const parsed = itemSchema.safeParse(entry)
    return parsed.success ? [parsed.data] : []
  })
  return { items, totalCount: body.totalCount ?? list.length }
}

/** 즐겨찾기 등 앱이 저장·전달하는 정류소 — 지도에 보이는 정류소는 모두 이 범위를 지킨다 */
export const busStopSchema = z.object({
  id: z.string().regex(TAGO_ID_PATTERN),
  name: z.string().min(1).max(64),
  number: z.string().max(16).nullable(),
  lat: z.number().min(33).max(39),
  lng: z.number().min(124).max(132)
}) satisfies z.ZodType<BusStop>

export const busFavoriteSchema = z.object({
  stop: busStopSchema,
  route: z.object({ id: z.string().regex(TAGO_ID_PATTERN), number: z.string().max(16) }).nullable()
}) satisfies z.ZodType<BusFavorite>

/** 빈 문자열·null 좌표는 coerce가 0으로 바꾸므로 범위 검사로 거른다 */
const stopFields = {
  nodeid: z.string().regex(TAGO_ID_PATTERN),
  nodenm: z.string().min(1).max(64),
  nodeno: z.union([z.string(), z.number()]).transform(String).pipe(z.string().max(16)).optional(),
  gpslati: z.coerce.number().min(33).max(39),
  gpslong: z.coerce.number().min(124).max(132)
}

function toStop(item: z.output<z.ZodObject<typeof stopFields>>): BusStop {
  return {
    id: item.nodeid,
    name: item.nodenm,
    number: item.nodeno ?? null,
    lat: item.gpslati,
    lng: item.gpslong
  }
}

/** 근처 정류소 조회는 도시를 가리지 않아 세종·계룡 코드로 같은 정류소가 겹쳐 온다 */
export const stopItemSchema = z
  .object({ ...stopFields, citycode: z.coerce.number().optional() })
  .refine((item) => item.citycode === undefined || item.citycode === DAEJEON_CITY_CODE)
  .transform(toStop)

export const routeItemSchema = z
  .object({
    routeid: z.string().regex(TAGO_ID_PATTERN),
    routeno: z.union([z.string(), z.number()]).transform(String).pipe(z.string().min(1).max(16)),
    routetp: z.string().optional(),
    startnodenm: z.string().optional(),
    endnodenm: z.string().optional()
  })
  .transform(
    (item): BusRoute => ({
      id: item.routeid,
      number: item.routeno,
      type: item.routetp ?? null,
      start: item.startnodenm ?? null,
      end: item.endnodenm ?? null
    })
  )

export const routeStopItemSchema = z
  .object({ ...stopFields, nodeord: z.coerce.number(), updowncd: z.coerce.number() })
  .transform(
    (item): BusRouteStop => ({ ...toStop(item), order: item.nodeord, updown: item.updowncd })
  )
