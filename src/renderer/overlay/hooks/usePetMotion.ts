import type { PetMotion } from '@preload/api'
import { type RefObject, useEffect } from 'react'

function positionAt(motion: PetMotion, now: number): number {
  const x = motion.startX + motion.velocity * (now - motion.startedAt)
  return Math.min(Math.max(x, motion.minX), motion.maxX)
}

/** 프레임마다 React를 다시 그리지 않고 DOM 스타일만 바꾼다 */
export function usePetMotion(petRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    let motion: PetMotion | null = null
    let frame = 0

    const render = (): void => {
      const pet = petRef.current
      if (pet && motion) {
        const x = positionAt(motion, Date.now())
        pet.style.width = `${motion.size}px`
        pet.style.height = `${motion.size}px`
        pet.style.transform = `translate3d(${x}px, ${motion.y}px, 0)`
        pet.dataset.activity = motion.activity
        pet.dataset.direction = String(motion.direction)
      }
      frame = requestAnimationFrame(render)
    }

    const unsubscribe = window.api.pet.onMotionChange((next) => {
      motion = next
    })
    // 구독이 먼저 받은 최신 구간을 늦게 도착한 초기값이 덮지 않게 한다
    void window.api.pet.getMotion().then((initial) => {
      motion ??= initial
    })
    frame = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
    }
  }, [petRef])
}
