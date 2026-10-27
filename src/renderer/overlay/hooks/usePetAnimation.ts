import type { PetMotion, PetSprite, PetSpriteAnimation } from '@preload/api'
import { type RefObject, useEffect } from 'react'

function positionAt(motion: PetMotion, now: number): number {
  const x = motion.startX + motion.velocity * (now - motion.startedAt)
  return Math.min(Math.max(x, motion.minX), motion.maxX)
}

function frameColumn(animation: PetSpriteAnimation, elapsedMs: number): number {
  return Math.floor((elapsedMs * animation.fps) / 1000) % animation.frames
}

function msUntilNextFrame(animation: PetSpriteAnimation, elapsedMs: number): number {
  const frameMs = 1000 / animation.fps
  return frameMs - (elapsedMs % frameMs) + 1
}

/** 프레임마다 React를 다시 그리지 않고 DOM 스타일만 바꾼다 */
export function usePetAnimation(
  petRef: RefObject<HTMLElement | null>,
  bodyRef: RefObject<HTMLElement | null>,
  sprite: PetSprite | null | undefined
): void {
  useEffect(() => {
    let active = true
    let motion: PetMotion | null = null
    let frame = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = (): void => {
      const pet = petRef.current
      if (!pet || !motion) return
      const now = Date.now()
      pet.style.transform = `translate3d(${positionAt(motion, now)}px, ${motion.y}px, 0)`

      const body = bodyRef.current
      const animation =
        motion.activity === 'walking' ? sprite?.animations.walk : sprite?.animations.idle
      // 시스템 시계가 뒤로 가면 음수 — 음수 나머지는 시트의 빈 열을 가리킨다
      const elapsedMs = Math.max(0, now - motion.startedAt)
      if (sprite && animation && body) {
        const x = -frameColumn(animation, elapsedMs) * sprite.frameWidth
        const y = -animation.row * sprite.frameHeight
        body.style.backgroundPosition = `${x}px ${y}px`
      }

      // 대기 중에는 위치가 그대로라 스프라이트 프레임이 바뀔 때만 깨어난다
      if (motion.velocity !== 0) frame = requestAnimationFrame(tick)
      else if (animation) timer = setTimeout(tick, msUntilNextFrame(animation, elapsedMs))
    }

    const apply = (next: PetMotion): void => {
      motion = next
      const pet = petRef.current
      if (pet) {
        pet.style.width = `${next.width}px`
        pet.style.height = `${next.height}px`
        pet.dataset.direction = String(next.direction)
      }
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      tick()
    }

    const unsubscribe = window.api.pet.onMotionChange(apply)
    // 구독이 먼저 받은 최신 구간을 늦게 도착한 초기값이 덮지 않게 한다
    void window.api.pet.getMotion().then((initial) => {
      if (active && !motion && initial) apply(initial)
    })

    return () => {
      active = false
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      unsubscribe()
    }
  }, [petRef, bodyRef, sprite])
}
