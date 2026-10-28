import { DAEJEON_ARRIVAL_URL, parseDaejeonArrivals } from '@main/bus/daejeon'
import {
  isKnownPortalError,
  maskServiceKey,
  normalizeServiceKey,
  PortalError,
  toBusErrorCode
} from '@main/bus/portal'
import {
  DAEJEON_CITY_CODE,
  parseTagoPage,
  routeItemSchema,
  routeStopItemSchema,
  stopItemSchema,
  type TagoPage
} from '@main/bus/tago'
import { readSecret } from '@main/store/secrets'
import type {
  BusApiName,
  BusArrival,
  BusErrorCode,
  BusResult,
  BusRoute,
  BusRouteStop,
  BusStop,
  BusStopSearch
} from '@preload/api'
import { net } from 'electron'
import { z } from 'zod'

const TAGO_BASE_URL = 'https://apis.data.go.kr/1613000'
const REQUEST_TIMEOUT_MS = 10_000
/** 정상 응답은 수십 KB — 비정상적으로 큰 응답을 파싱하다 메인 프로세스가 멈추지 않게 */
const MAX_RESPONSE_CHARS = 512 * 1024
const PAGE_SIZE = '100'
/** 순환 노선은 경유 정류소가 100개를 넘을 수 있어 넉넉히 받는다 */
const ROUTE_PATH_PAGE_SIZE = '300'
const CITY_PARAMS = { cityCode: String(DAEJEON_CITY_CODE), pageNo: '1', numOfRows: PAGE_SIZE }
/** 정류소·노선은 자주 바뀌지 않음 — 지도를 오가며 같은 조회를 반복하지 않되 상주 앱이라 하루 뒤엔 다시 받는다 */
const STATIC_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const STATIC_CACHE_LIMIT = 200
/** 소수 셋째 자리 ≈ 100m 격자 — 지도를 조금 옮겼다 돌아와도 같은 칸이면 캐시를 쓴다 */
const NEARBY_GRID_DECIMALS = 3

const TAGO_SERVICES = {
  stop: 'BusSttnInfoInqireService',
  route: 'BusRouteInfoInqireService'
} as const
/** 키 테스트용 — 대전시청 정류소, 운행 시간이 아니면 결과 없음으로 정상 응답한다 */
const KEY_TEST_DAEJEON_STOP = '8001378'

class BusRequestError extends Error {
  constructor(readonly code: BusErrorCode) {
    super(code)
  }
}

interface CacheEntry<T> {
  value: T
  savedAt: number
}

/** 저장된 키로 부르고, 로그에는 키를 가린 원인만 남긴다. 파서에는 서버 시각(Date 헤더)도 넘긴다 */
async function request<T>(
  label: string,
  url: string,
  params: Record<string, string>,
  parse: (text: string, serverNow: number | null) => T
): Promise<T> {
  const savedKey = await readSecret('busServiceKey')
  if (!savedKey) throw new BusRequestError('no-key')
  const key = normalizeServiceKey(savedKey)

  const query = new URLSearchParams({ ...params, serviceKey: key })
  let text: string
  let serverNow: number | null
  try {
    const response = await net.fetch(`${url}?${query}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    text = await response.text()
    const date = Date.parse(response.headers.get('date') ?? '')
    serverNow = Number.isNaN(date) ? null : date
  } catch (error) {
    console.error(`[bus] ${label} failed:`, maskServiceKey(String(error), key))
    throw new BusRequestError('network')
  }

  try {
    if (text.length > MAX_RESPONSE_CHARS) {
      throw new PortalError('too-large', `${text.length} chars`)
    }
    return parse(text, serverNow)
  } catch (error) {
    if (error instanceof PortalError && !isKnownPortalError(error)) {
      const detail = maskServiceKey(`${error.code} ${error.message}`, key)
      console.error(`[bus] ${label} unexpected response:`, detail)
    }
    throw error
  }
}

function requestTago<T>(
  service: keyof typeof TAGO_SERVICES,
  operation: string,
  params: Record<string, string>,
  itemSchema: z.ZodType<T>
): Promise<TagoPage<T>> {
  const url = `${TAGO_BASE_URL}/${TAGO_SERVICES[service]}/${operation}`
  return request(`${service}/${operation}`, url, { ...params, _type: 'json' }, (text) =>
    parseTagoPage(text, itemSchema)
  )
}

function requestDaejeonArrivals(stopId: string): Promise<BusArrival[]> {
  // 대전시 정류소 ID는 TAGO ID에서 `DJB`를 뗀 숫자
  const params = { BusStopID: stopId.replace(/^DJB/, '') }
  return request('arrival', DAEJEON_ARRIVAL_URL, params, (text, serverNow) =>
    parseDaejeonArrivals(text, serverNow)
  )
}

async function requestItems<T>(
  api: keyof typeof TAGO_SERVICES,
  operation: string,
  params: Record<string, string>,
  itemSchema: z.ZodType<T>
): Promise<T[]> {
  return (await requestTago(api, operation, params, itemSchema)).items
}

async function toResult<T>(task: () => Promise<T>): Promise<BusResult<T>> {
  try {
    return { ok: true, data: await task() }
  } catch (error) {
    if (error instanceof BusRequestError) return { ok: false, error: error.code }
    if (!(error instanceof PortalError)) console.error('[bus] unexpected error:', String(error))
    return { ok: false, error: toBusErrorCode(error) }
  }
}

/** 빈 결과는 "잘못된 ID"와 "일시적 누락"을 구분할 수 없어 캐시하지 않는다 */
function createStaticCache<T>(
  isEmpty: (value: T) => boolean
): (key: string, load: () => Promise<T>) => Promise<T> {
  const entries = new Map<string, CacheEntry<T>>()
  return async (key, load) => {
    const hit = entries.get(key)
    if (hit && Date.now() - hit.savedAt < STATIC_CACHE_TTL_MS) return hit.value

    const value = await load()
    if (isEmpty(value)) return value
    entries.delete(key)
    if (entries.size >= STATIC_CACHE_LIMIT) entries.delete(entries.keys().next().value as string)
    entries.set(key, { value, savedAt: Date.now() })
    return value
  }
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

const isEmptyList = (items: unknown[]): boolean => items.length === 0
const nearbyCache = createStaticCache<BusStop[]>(isEmptyList)
const searchCache = createStaticCache<BusStopSearch>(({ stops }) => stops.length === 0)
const stopRoutesCache = createStaticCache<BusRoute[]>(isEmptyList)
const routePathCache = createStaticCache<BusRouteStop[]>(isEmptyList)

export function nearbyStops(lat: number, lng: number): Promise<BusResult<BusStop[]>> {
  const gpsLati = lat.toFixed(NEARBY_GRID_DECIMALS)
  const gpsLong = lng.toFixed(NEARBY_GRID_DECIMALS)
  return toResult(() =>
    nearbyCache(`${gpsLati},${gpsLong}`, async () =>
      uniqueById(
        await requestItems(
          'stop',
          'getCrdntPrxmtSttnList',
          { pageNo: '1', numOfRows: PAGE_SIZE, gpsLati, gpsLong },
          stopItemSchema
        )
      )
    )
  )
}

export function searchStops(name: string): Promise<BusResult<BusStopSearch>> {
  return toResult(() =>
    searchCache(name, async () => {
      const page = await requestTago(
        'stop',
        'getSttnNoList',
        { ...CITY_PARAMS, nodeNm: name },
        stopItemSchema
      )
      return { stops: uniqueById(page.items), truncated: page.totalCount > Number(PAGE_SIZE) }
    })
  )
}

export function stopRoutes(stopId: string): Promise<BusResult<BusRoute[]>> {
  return toResult(() =>
    stopRoutesCache(stopId, async () =>
      uniqueById(
        await requestItems(
          'stop',
          'getSttnThrghRouteList',
          // 이 오퍼레이션만 정류소 ID 파라미터가 소문자 `nodeid`
          { ...CITY_PARAMS, nodeid: stopId },
          routeItemSchema
        )
      ).sort((a, b) => a.number.localeCompare(b.number, 'ko', { numeric: true }))
    )
  )
}

export function routePath(routeId: string): Promise<BusResult<BusRouteStop[]>> {
  return toResult(() =>
    routePathCache(routeId, async () =>
      (
        await requestItems(
          'route',
          'getRouteAcctoThrghSttnList',
          { ...CITY_PARAMS, numOfRows: ROUTE_PATH_PAGE_SIZE, routeId },
          routeStopItemSchema
        )
      ).sort((a, b) => a.order - b.order)
    )
  )
}

export function stopArrivals(stopId: string): Promise<BusResult<BusArrival[]>> {
  return toResult(async () =>
    (await requestDaejeonArrivals(stopId)).sort((a, b) => a.secondsLeft - b.secondsLeft)
  )
}

/** 활용신청을 빠뜨린 API를 찾게 API마다 따로 판정 — TAGO는 가장 가벼운 도시코드 목록으로 */
export async function testBusKey(): Promise<Record<BusApiName, BusErrorCode | 'ok'>> {
  const outcome = async (task: () => Promise<unknown>): Promise<BusErrorCode | 'ok'> => {
    const result = await toResult(task)
    return result.ok ? 'ok' : result.error
  }
  const [stop, route, arrival] = await Promise.all([
    outcome(() => requestItems('stop', 'getCtyCodeList', {}, z.unknown())),
    outcome(() => requestItems('route', 'getCtyCodeList', {}, z.unknown())),
    outcome(() => requestDaejeonArrivals(KEY_TEST_DAEJEON_STOP))
  ])
  return { stop, route, arrival }
}
