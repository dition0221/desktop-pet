import type { PetSprite } from '@preload/api'
import { usePetAnimation } from '@renderer/overlay/hooks/usePetAnimation'
import { usePetSpeech } from '@renderer/overlay/hooks/usePetSpeech'
import SpeechBubble, { type BubbleAlign } from '@renderer/overlay/SpeechBubble'
import { useMainValue } from '@renderer/shared/hooks/useMainValue'
import { useLayoutEffect, useRef, useState } from 'react'

/** 말풍선 최대 폭(max-w-64)의 절반 — 펫이 화면 끝에서 이보다 가까우면 말풍선을 안쪽으로 편다 */
const BUBBLE_HALF_WIDTH = 128

const REACTION_KEYFRAMES: Keyframe[] = [
  { transform: 'scale(1, 1)' },
  { transform: 'scale(1.15, 0.8)' },
  { transform: 'scale(0.9, 1.1)' },
  { transform: 'scale(1, 1)' }
]

function getSpriteOrFallback(): Promise<PetSprite | null> {
  return window.api.pet.getSprite().catch(() => null)
}

function Pet(): React.JSX.Element {
  const petRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  // undefined = 불러오는 중, null = 팩을 못 읽어 임시 사각형
  const sprite = useMainValue<PetSprite | null>(getSpriteOrFallback, window.api.pet.onSpriteChange)
  const [bubbleAlign, setBubbleAlign] = useState<BubbleAlign>('center')
  const speech = usePetSpeech()
  usePetAnimation(petRef, bodyRef, sprite)

  // 말풍선이 떠 있는 동안 메인이 펫을 세워 두므로 띄울 때 한 번만 정한다
  useLayoutEffect(() => {
    const rect = petRef.current?.getBoundingClientRect()
    if (!speech || !rect) return
    const center = rect.left + rect.width / 2
    if (center < BUBBLE_HALF_WIDTH) setBubbleAlign('left')
    else if (center > window.innerWidth - BUBBLE_HALF_WIDTH) setBubbleAlign('right')
    else setBubbleAlign('center')
  }, [speech])

  const react = (): void => {
    bodyRef.current?.animate(REACTION_KEYFRAMES, { duration: 300, easing: 'ease-out' })
  }

  const showContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault()
    void window.api.pet.showContextMenu()
  }

  return (
    <button
      ref={petRef}
      type="button"
      aria-label="펫"
      onClick={react}
      onDoubleClick={() => void window.api.pet.openMainWindow()}
      onContextMenu={showContextMenu}
      className="group absolute top-0 left-0 size-0 will-change-transform"
    >
      {sprite && (
        // 시트 전체 크기를 몰라도 배율을 적용하려고 background-size 대신 zoom
        <div
          ref={bodyRef}
          className="origin-bottom [image-rendering:pixelated] group-data-[direction=-1]:-scale-x-100"
          style={{
            width: sprite.frameWidth,
            height: sprite.frameHeight,
            zoom: sprite.scale,
            backgroundImage: `url("${sprite.url}")`
          }}
        />
      )}
      {sprite === null && <div ref={bodyRef} className="size-full rounded-lg bg-sky-400/90" />}
      {speech && <SpeechBubble key={speech.id} text={speech.text} align={bubbleAlign} />}
    </button>
  )
}

export default Pet
