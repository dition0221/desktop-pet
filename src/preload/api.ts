/** preload 구현과 렌더러 타입 선언이 함께 참조 — 기능 추가 시 시그니처를 여기에 먼저 정의 */
export interface DesktopPetApi {
  pet: {
    getVisible(): Promise<boolean>
    /** 메인 창에서만 허용 */
    setVisible(visible: boolean): Promise<void>
    /** 반환값을 호출하면 구독 해제 */
    onVisibleChange(listener: (visible: boolean) => void): () => void
  }
}
