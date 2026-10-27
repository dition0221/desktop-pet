import { parseDaejeonArrivals } from '@main/bus/daejeon'
import { PortalError, toBusErrorCode } from '@main/bus/portal'
import { describe, expect, it } from 'vitest'

/** 서버 시각 2026-10-28 06:41:30 KST — PC 시간대와 상관없이 같은 값 */
const SERVER_NOW = Date.parse('2026-10-28T06:41:30+09:00')

function item(fields: Record<string, string>): string {
  const base: Record<string, string> = {
    BUS_NODE_ID: '8002605',
    CAR_REG_NO: '대전75자3333',
    DESTINATION: '안산동',
    EXTIME_MIN: '10',
    EXTIME_SEC: '580',
    INFO_OFFER_TM: '2026-10-28 06:41:30',
    MSG_TP: '03',
    ROUTE_CD: '30300036',
    ROUTE_NO: '101',
    ROUTE_TP: '2  ',
    STATUS_POS: '6',
    STOP_NAME: '중구청역',
    ...fields
  }
  return `<itemList>${Object.entries(base)
    .map(([name, value]) => `<${name}>${value}</${name}>`)
    .join('')}</itemList>`
}

function response(items: string[], headerCd = '0'): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><ServiceResult><msgHeader><currentPage>1</currentPage><headerCd>${headerCd}</headerCd><headerMsg>정상적으로 처리되었습니다.</headerMsg><itemCnt>${items.length}</itemCnt><itemPageCnt>1</itemPageCnt></msgHeader><msgBody>${items.join('')}</msgBody></ServiceResult>`
}

describe('parseDaejeonArrivals', () => {
  it('실측 응답 형식을 도착 정보로 바꾼다', () => {
    expect(parseDaejeonArrivals(response([item({})]), SERVER_NOW)).toEqual([
      {
        routeId: 'DJB30300036',
        routeNumber: '101',
        secondsLeft: 580,
        stopsLeft: 6,
        vehicleId: '대전75자3333',
        destination: '안산동'
      }
    ])
  })

  it('남은 시간은 정보 시각부터 서버 시각까지 흐른 만큼 뺀다', () => {
    const [arrival] = parseDaejeonArrivals(
      response([item({ INFO_OFFER_TM: '2026-10-28 06:40:30' })]),
      SERVER_NOW
    )
    expect(arrival.secondsLeft).toBe(520)
  })

  it('서버 시각이 없으면 응답에서 가장 최근 정보 시각을 기준으로 삼는다', () => {
    const items = [
      item({ ROUTE_NO: '101', INFO_OFFER_TM: '2026-10-28 06:41:30' }),
      item({ ROUTE_NO: '102', INFO_OFFER_TM: '2026-10-28 06:40:30', EXTIME_SEC: '300' })
    ]
    const arrivals = parseDaejeonArrivals(response(items), null)
    expect(arrivals.map((a) => [a.routeNumber, a.secondsLeft])).toEqual([
      ['101', 580],
      ['102', 240]
    ])
  })

  it('결과 없음(headerCd 4)은 빈 목록이다', () => {
    const empty = `<ServiceResult><msgHeader><headerCd>4</headerCd><headerMsg>결과가 없습니다.</headerMsg></msgHeader><msgBody/></ServiceResult>`
    expect(parseDaejeonArrivals(empty, SERVER_NOW)).toEqual([])
  })

  it('갱신이 멈춘 차량은 버린다', () => {
    const items = [
      item({ ROUTE_NO: '315', MSG_TP: '07' }),
      item({ ROUTE_NO: '316', INFO_OFFER_TM: '2026-10-28 06:30:00' }),
      item({ ROUTE_NO: '101' })
    ]
    const arrivals = parseDaejeonArrivals(response(items), SERVER_NOW)
    expect(arrivals.map((a) => a.routeNumber)).toEqual(['101'])
  })

  it('형식이 다른 항목은 그 항목만 버린다', () => {
    const items = [item({ EXTIME_SEC: '' }), item({ ROUTE_CD: 'x' }), item({})]
    expect(parseDaejeonArrivals(response(items), SERVER_NOW)).toHaveLength(1)
  })

  it('XML 엔티티를 풀고, 잘못된 문자 참조는 그대로 둔다', () => {
    const items = [
      item({ DESTINATION: 'A&amp;B&#X41;' }),
      item({ CAR_REG_NO: 'x', DESTINATION: '&#x110000;&constructor;' })
    ]
    const arrivals = parseDaejeonArrivals(response(items), SERVER_NOW)
    expect(arrivals.map((a) => a.destination)).toEqual(['A&BA', '&#x110000;&constructor;'])
  })

  it('닫는 태그가 없는 큰 응답도 금방 끝난다', () => {
    const broken = `<ServiceResult><msgHeader><headerCd>0</headerCd></msgHeader>${'<itemList>'.repeat(50_000)}`
    const startedAt = performance.now()
    expect(parseDaejeonArrivals(broken, SERVER_NOW)).toEqual([])
    expect(performance.now() - startedAt).toBeLessThan(500)
  })

  it('게이트웨이 인증 오류와 서비스 오류를 구분한다', () => {
    const gateway =
      '<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>'
    let caught: unknown
    try {
      parseDaejeonArrivals(gateway, SERVER_NOW)
    } catch (error) {
      caught = error
    }
    expect(toBusErrorCode(caught)).toBe('invalid-key')
    expect(() => parseDaejeonArrivals(response([], '2'), SERVER_NOW)).toThrow(PortalError)
  })
})
