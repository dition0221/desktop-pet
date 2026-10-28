import type { BusErrorCode } from '@preload/api'

export const BUS_ERROR_MESSAGES: Record<BusErrorCode, string> = {
  'no-key': '설정에서 버스 키를 먼저 저장하세요',
  'invalid-key':
    '키가 잘못됐거나 이 API를 활용신청하지 않았어요 — 발급·신청 직후라면 잠시 뒤 다시 시도하세요',
  'not-allowed': '이 API는 공공데이터포털에서 활용신청이 필요해요',
  'quota-exceeded': '오늘 호출 한도를 다 썼어요',
  network: '네트워크 오류로 불러오지 못했어요',
  unknown: '버스 정보를 불러오지 못했어요'
}
