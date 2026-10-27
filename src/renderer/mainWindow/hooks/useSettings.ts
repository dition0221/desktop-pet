import type { Settings } from '@preload/api'
import { useEffect, useState } from 'react'

/** 메인 프로세스가 원본 — 첫 조회 전에는 null */
export function useSettings(): Settings | null {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    const unsubscribe = window.api.settings.onChange(setSettings)
    void window.api.settings.get().then(setSettings)
    return unsubscribe
  }, [])

  return settings
}
