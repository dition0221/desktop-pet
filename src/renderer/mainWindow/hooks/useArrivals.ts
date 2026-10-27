import type { ArrivalsSnapshot } from '@preload/api'
import { useEffect, useState } from 'react'

/** 메인 프로세스가 원본 — 첫 조회 전에는 null */
export function useArrivals(): ArrivalsSnapshot | null {
  const [snapshot, setSnapshot] = useState<ArrivalsSnapshot | null>(null)

  useEffect(() => {
    const unsubscribe = window.api.bus.onArrivalsChange(setSnapshot)
    void window.api.bus.getArrivals().then(setSnapshot)
    return unsubscribe
  }, [])

  return snapshot
}
