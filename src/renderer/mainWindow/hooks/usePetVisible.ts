import { useEffect, useState } from 'react'

/** 메인 프로세스가 원본 — 첫 조회 전에는 null */
export function usePetVisible(): boolean | null {
  const [visible, setVisible] = useState<boolean | null>(null)

  useEffect(() => {
    const unsubscribe = window.api.pet.onVisibleChange(setVisible)
    void window.api.pet.getVisible().then(setVisible)
    return unsubscribe
  }, [])

  return visible
}
