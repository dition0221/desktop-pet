import type { PetSpeech } from '@preload/api'
import { useEffect, useState } from 'react'

/** 말풍선을 하나씩 차례로 — 지금 보여 줄 것이 없으면 null */
export function usePetSpeech(): PetSpeech | null {
  const [queue, setQueue] = useState<PetSpeech[]>([])
  const current = queue[0] ?? null

  useEffect(() => {
    const seen = new Set<number>()
    const enqueue = (speeches: PetSpeech[]): void => {
      const fresh = speeches.filter((speech) => !seen.has(speech.id))
      for (const speech of fresh) seen.add(speech.id)
      if (fresh.length > 0) setQueue((items) => [...items, ...fresh])
    }
    const unsubscribe = window.api.pet.onSpeech((speech) => enqueue([speech]))
    void window.api.pet.getRecentSpeeches().then(enqueue)
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!current) return
    const timer = setTimeout(() => setQueue((items) => items.slice(1)), current.durationMs)
    return () => clearTimeout(timer)
  }, [current])

  return current
}
