import type { PetSprite } from '@preload/api'
import { usePetAnimation } from '@renderer/overlay/hooks/usePetAnimation'
import { useEffect, useRef, useState } from 'react'

const REACTION_KEYFRAMES: Keyframe[] = [
  { transform: 'scale(1, 1)' },
  { transform: 'scale(1.15, 0.8)' },
  { transform: 'scale(0.9, 1.1)' },
  { transform: 'scale(1, 1)' }
]

function Pet(): React.JSX.Element {
  const petRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  // undefined = 불러오는 중, null = 팩을 못 읽어 임시 사각형
  const [sprite, setSprite] = useState<PetSprite | null>()
  usePetAnimation(petRef, bodyRef, sprite)

  useEffect(() => {
    const unsubscribe = window.api.pet.onSpriteChange(setSprite)
    void window.api.pet.getSprite().then(setSprite, () => setSprite(null))
    return unsubscribe
  }, [])

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
    </button>
  )
}

export default Pet
