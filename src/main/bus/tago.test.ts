import { isKnownPortalError, PortalError, toBusErrorCode } from '@main/bus/portal'
import { parseTagoPage, routeItemSchema, routeStopItemSchema, stopItemSchema } from '@main/bus/tago'
import { describe, expect, it } from 'vitest'

function envelope(items: unknown, resultCode = '00', totalCount?: number): string {
  return JSON.stringify({
    response: {
      header: { resultCode, resultMsg: 'NORMAL SERVICE.' },
      body: { items, totalCount }
    }
  })
}

const STOP = {
  gpslati: 36.33046,
  gpslong: 127.43108,
  nodeid: 'DJB8001413',
  nodenm: '대전역',
  nodeno: 12460
}
const GATEWAY_ERROR =
  '<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE ERROR</errMsg><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>'

function catchError(task: () => unknown): unknown {
  try {
    task()
  } catch (error) {
    return error
  }
  throw new Error('expected an error')
}

describe('parseTagoPage', () => {
  it('여러 건·한 건·빈 결과를 모두 배열로 돌려준다', () => {
    expect(parseTagoPage(envelope({ item: [STOP, STOP] }), stopItemSchema).items).toHaveLength(2)
    expect(parseTagoPage(envelope({ item: STOP }), stopItemSchema).items).toEqual([
      { id: 'DJB8001413', name: '대전역', number: '12460', lat: 36.33046, lng: 127.43108 }
    ])
    expect(parseTagoPage(envelope(''), stopItemSchema)).toEqual({ items: [], totalCount: 0 })
  })

  it('전체 건수를 함께 돌려줘 잘림을 판정할 수 있다', () => {
    expect(parseTagoPage(envelope({ item: STOP }, '00', 230), stopItemSchema).totalCount).toBe(230)
  })

  it('다른 도시 코드로 겹쳐 온 정류소와 형식이 다른 항목은 버린다', () => {
    const items = [
      { ...STOP, citycode: 25 },
      { ...STOP, nodeid: 'SJB183002358', citycode: 12 },
      { ...STOP, nodeid: 'DJB8001415', citycode: 34070 },
      { nodenm: '좌표 없음', nodeid: 'DJB1' }
    ]
    const page = parseTagoPage(envelope({ item: items }), stopItemSchema)
    expect(page.items.map((s) => s.id)).toEqual(['DJB8001413'])
  })

  it('빈 좌표가 0으로 바뀌어 지도 밖으로 튀는 정류소는 버린다', () => {
    const items = [
      { ...STOP, gpslati: '', gpslong: '' },
      { ...STOP, gpslati: null }
    ]
    expect(parseTagoPage(envelope({ item: items }), stopItemSchema).items).toEqual([])
  })

  it('결과 코드가 정상이 아니면 PortalError를 던진다', () => {
    expect(() => parseTagoPage(envelope('', '22'), stopItemSchema)).toThrow(PortalError)
  })

  it('게이트웨이 XML 오류를 코드로 바꾼다', () => {
    const error = catchError(() => parseTagoPage(GATEWAY_ERROR, stopItemSchema))
    expect(toBusErrorCode(error)).toBe('invalid-key')
    expect(toBusErrorCode(new PortalError('22', 'LIMITED'))).toBe('quota-exceeded')
    expect(toBusErrorCode(new Error('boom'))).toBe('unknown')
  })

  it('형식이 다른 응답은 네트워크 오류가 아니라 알 수 없는 응답으로 분류한다', () => {
    const error = catchError(() => parseTagoPage('{"unexpected":true}', stopItemSchema))
    expect(error).toBeInstanceOf(PortalError)
    expect(isKnownPortalError(error as PortalError)).toBe(false)
    expect(toBusErrorCode(error)).toBe('unknown')
  })
})

describe('항목 변환', () => {
  it('노선 번호는 숫자로 와도 문자열로 바꾼다', () => {
    const route = {
      routeid: 'DJB30300076',
      routeno: 612,
      routetp: '간선버스',
      startnodenm: 'A',
      endnodenm: 'B'
    }
    expect(routeItemSchema.parse(route)).toEqual({
      id: 'DJB30300076',
      number: '612',
      type: '간선버스',
      start: 'A',
      end: 'B'
    })
  })

  it('노선 경유 정류소는 순서와 상하행을 가진다', () => {
    const stop = { ...STOP, nodeord: 3, updowncd: 1, routeid: 'DJB30300076' }
    expect(routeStopItemSchema.parse(stop)).toMatchObject({ id: 'DJB8001413', order: 3, updown: 1 })
  })
})
