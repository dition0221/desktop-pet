import { usePetMotion } from '@renderer/overlay/hooks/usePetMotion'
import { useRef } from 'react'

const REACTION_KEYFRAMES: Keyframe[] = [
  { transform: 'scale(1, 1)' },
  { transform: 'scale(1.15, 0.8)' },
  { transform: 'scale(0.9, 1.1)' },
  { transform: 'scale(1, 1)' }
]

/** TODO(R3) — 팩 스프라이트로 교체 */
function Pet(): React.JSX.Element {
  const petRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  usePetMotion(petRef)

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
      <div
        ref={bodyRef}
        className="relative size-full origin-bottom rounded-lg bg-sky-400/90 group-data-[activity=walking]:animate-pet-walk group-data-[direction=-1]:-scale-x-100"
      >
        <span className="absolute top-4 right-3 size-2 rounded-full bg-neutral-800" />
      </div>
    </button>
  )
}

export default Pet
