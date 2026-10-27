/** 오버레이 창 기준 좌표(DIP) — x는 startX에서 velocity로 등속 이동하고 [minX, maxX]로 자른다 */
export interface PetMotion {
  activity: 'walking' | 'idle'
  direction: 1 | -1
  size: number
  y: number
  startX: number
  minX: number
  maxX: number
  /** px/ms, 방향 포함 */
  velocity: number
  /** epoch ms — 메인과 렌더러가 같은 시스템 시계를 쓴다 */
  startedAt: number
}

/** preload 구현과 렌더러 타입 선언이 함께 참조 — 기능 추가 시 시그니처를 여기에 먼저 정의 */
export interface DesktopPetApi {
  pet: {
    getVisible(): Promise<boolean>
    /** 메인 창에서만 허용 */
    setVisible(visible: boolean): Promise<void>
    /** 반환값을 호출하면 구독 해제 */
    onVisibleChange(listener: (visible: boolean) => void): () => void
    /** 오버레이에서만 허용 */
    getMotion(): Promise<PetMotion | null>
    onMotionChange(listener: (motion: PetMotion) => void): () => void
    /** 오버레이에서만 허용 */
    openMainWindow(): Promise<void>
    /** 오버레이에서만 허용 */
    showContextMenu(): Promise<void>
  }
}
