import { parseDaejeonArrivals } from '@main/bus/daejeon'
import { TagoError, toBusErrorCode } from '@main/bus/tago'
import { describe, expect, it } from 'vitest'

const NOW = new Date(2026, 9, 28, 6, 41, 30).getTime()

function item(fields: Record<string, string>): string {
  const base: Record<string, string> = {
    BUS_NODE_ID: '8002605',
    CAR_REG_NO: '대전75자3333',
    DESTINATION: '안산동',
    EXTIME_MIN: '10',
    EXTIME_SEC: '580',
    INFO_OFFER_TM: '2026-10-28 06:41:26',
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
    expect(parseDaejeonArrivals(response([item({})]), NOW)).toEqual([
      {
        routeId: 'DJB30300036',
        routeNumber: '101',
        routeType: '간선버스',
        secondsLeft: 580,
        stopsLeft: 6,
        vehicleId: '대전75자3333',
        destination: '안산동'
      }
    ])
  })

  it('결과 없음(headerCd 4)은 빈 목록이다', () => {
    const empty = `<ServiceResult><msgHeader><headerCd>4</headerCd><headerMsg>결과가 없습니다.</headerMsg></msgHeader><msgBody/></ServiceResult>`
    expect(parseDaejeonArrivals(empty, NOW)).toEqual([])
  })

  it('갱신이 멈춘 차량은 버린다', () => {
    const items = [
      item({ ROUTE_NO: '315', MSG_TP: '07', INFO_OFFER_TM: '2026-10-28 06:31:16' }),
      item({ ROUTE_NO: '316', INFO_OFFER_TM: '2026-10-28 06:30:00' }),
      item({ ROUTE_NO: '101' })
    ]
    expect(parseDaejeonArrivals(response(items), NOW).map((a) => a.routeNumber)).toEqual(['101'])
  })

  it('모르는 노선 유형은 표시하지 않고, 형식이 다른 항목은 버린다', () => {
    const items = [item({ ROUTE_TP: '9' }), item({ EXTIME_SEC: '' }), item({ ROUTE_CD: 'x' })]
    const arrivals = parseDaejeonArrivals(response(items), NOW)
    expect(arrivals).toHaveLength(1)
    expect(arrivals[0].routeType).toBeNull()
  })

  it('XML 엔티티를 풀어 행선지를 읽는다', () => {
    const [arrival] = parseDaejeonArrivals(response([item({ DESTINATION: 'A&amp;B' })]), NOW)
    expect(arrival.destination).toBe('A&B')
  })

  it('게이트웨이 인증 오류와 서비스 오류를 구분한다', () => {
    const gateway =
      '<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>'
    expect(() => parseDaejeonArrivals(gateway, NOW)).toThrow(TagoError)
    try {
      parseDaejeonArrivals(gateway, NOW)
    } catch (error) {
      expect(toBusErrorCode(error)).toBe('invalid-key')
    }
    expect(() => parseDaejeonArrivals(response([], '2'), NOW)).toThrow(TagoError)
  })
})
