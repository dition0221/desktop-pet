import { useEffect, useState } from 'react'

/** get·subscribe는 고정 참조로 넘긴다 — 인라인 함수면 렌더마다 다시 구독한다 */
export function useMainValue<T>(
  get: () => Promise<T>,
  subscribe: (listener: (value: T) => void) => () => void
): T | undefined {
  const [value, setValue] = useState<T>()

  useEffect(() => {
    // 변경 알림을 받았거나 정리된 뒤 도착한 처음 값은 더 오래된 값이다
    let settled = false
    const unsubscribe = subscribe((next) => {
      settled = true
      setValue(next)
    })
    void get().then((initial) => {
      if (!settled) setValue(initial)
    })
    return () => {
      settled = true
      unsubscribe()
    }
  }, [get, subscribe])

  return value
}
