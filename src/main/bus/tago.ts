import { gatewayError, PortalError } from '@main/bus/portal'
import type { BusFavorite, BusRoute, BusRouteStop, BusStop } from '@preload/api'
import { z } from 'zod'

export const DAEJEON_CITY_CODE = 25

/** TAGO 정류소·노선 ID — 대전은 `DJB` + 숫자 */
export const TAGO_ID_PATTERN = /^DJB\d{1,12}$/

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
    throw gatewayError(text) ?? new PortalError('non-json', text.slice(0, 200))
  }

  const envelope = envelopeSchema.safeParse(json)
  if (!envelope.success) {
    throw gatewayError(text) ?? new PortalError('invalid-response', envelope.error.message)
  }
  const { header, body } = envelope.data.response
  if (header.resultCode !== '00') throw new PortalError(header.resultCode, header.resultMsg)
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
  route: z.object({ id: z.string().regex(TAGO_ID_PATTERN), number: z.string().max(16) }).nullable(),
  alert: z.boolean().default(false)
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
