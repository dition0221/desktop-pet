import {
  gatewayError,
  isKnownPortalError,
  maskServiceKey,
  normalizeServiceKey,
  PortalError,
  toBusErrorCode
} from '@main/bus/portal'
import { describe, expect, it } from 'vitest'

describe('게이트웨이 오류', () => {
  it('인증 오류 XML을 코드로 바꾸고, 아니면 null', () => {
    const xml =
      '<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR</returnAuthMsg><returnReasonCode>22</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>'
    expect(toBusErrorCode(gatewayError(xml))).toBe('quota-exceeded')
    expect(gatewayError('<ServiceResult/>')).toBeNull()
  })

  it('매핑에 없는 코드와 다른 오류는 unknown', () => {
    expect(isKnownPortalError(new PortalError('constructor', ''))).toBe(false)
    expect(toBusErrorCode(new PortalError('99', ''))).toBe('unknown')
    expect(toBusErrorCode(new Error('boom'))).toBe('unknown')
  })
})

describe('서비스 키', () => {
  it('URL 파라미터와 원문·인코딩된 키를 모두 가린다', () => {
    const key = 'ab+c/d=='
    const text = `GET https://x/?serviceKey=${encodeURIComponent(key)}&a=1 failed (${key})`
    const masked = maskServiceKey(text, key)
    expect(masked).not.toContain(key)
    expect(masked).not.toContain(encodeURIComponent(key))
    expect(masked).toContain('serviceKey=***&a=1')
  })

  it('포털의 Encoding 키는 한 번 디코딩하고 Decoding 키는 그대로 둔다', () => {
    expect(normalizeServiceKey('ab%2Bc%2Fd%3D%3D')).toBe('ab+c/d==')
    expect(normalizeServiceKey('ab+c/d==')).toBe('ab+c/d==')
    expect(normalizeServiceKey('0a1b2c3d')).toBe('0a1b2c3d')
  })
})
