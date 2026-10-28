import type { BusErrorCode } from '@preload/api'

/** 공공데이터포털 게이트웨이는 인증·한도 오류를 요청 형식에 따라 XML이나 JSON(`_type=json`)으로 돌려준다 */
const GATEWAY_REASON_PATTERN = /returnReasonCode(?:>|"\s*:\s*"?)(\d+)/
const GATEWAY_MESSAGE_PATTERN = /returnAuthMsg(?:>|"\s*:\s*")([^<"]*)/
const PERCENT_ENCODED_PATTERN = /%[0-9a-f]{2}/i

const GATEWAY_ERROR_CODES: Record<string, BusErrorCode> = {
  '20': 'not-allowed',
  '22': 'quota-exceeded',
  '30': 'invalid-key',
  '31': 'invalid-key'
}

/** 공공데이터포털을 거친 API(TAGO·대전시)의 오류 */
export class PortalError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message)
  }
}

/** 매핑에 없는 코드는 원인을 찾을 수 있게 호출부가 로그를 남긴다 */
export function isKnownPortalError(error: PortalError): boolean {
  return Object.hasOwn(GATEWAY_ERROR_CODES, error.code)
}

export function toBusErrorCode(error: unknown): BusErrorCode {
  return error instanceof PortalError && isKnownPortalError(error)
    ? GATEWAY_ERROR_CODES[error.code]
    : 'unknown'
}

export function gatewayError(text: string): PortalError | null {
  const reason = text.match(GATEWAY_REASON_PATTERN)?.[1]
  return reason ? new PortalError(reason, text.match(GATEWAY_MESSAGE_PATTERN)?.[1] ?? '') : null
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
