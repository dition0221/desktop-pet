import type { PetSpeech } from '@preload/api'
import { useEffect, useState } from 'react'

export interface QueuedSpeech extends PetSpeech {
  /** 같은 문장이 연달아 와도 말풍선을 새로 띄우도록 붙이는 번호 */
  id: number
}

/** 말풍선을 하나씩 차례로 — 지금 보여 줄 것이 없으면 null */
export function usePetSpeech(): QueuedSpeech | null {
  const [queue, setQueue] = useState<QueuedSpeech[]>([])
  const current = queue[0] ?? null

  useEffect(() => {
    let nextId = 0
    return window.api.pet.onSpeech((speech) =>
      setQueue((items) => [...items, { ...speech, id: nextId++ }])
    )
  }, [])

  useEffect(() => {
    if (!current) return
    const timer = setTimeout(() => setQueue((items) => items.slice(1)), current.durationMs)
    return () => clearTimeout(timer)
  }, [current])

  return current
}
