/** 오버레이 창 기준 좌표(DIP) — x는 startX에서 velocity로 등속 이동하고 [minX, maxX]로 자른다 */
export interface PetMotion {
  activity: 'walking' | 'idle'
  direction: 1 | -1
  width: number
  height: number
  y: number
  startX: number
  minX: number
  maxX: number
  /** px/ms, 방향 포함 */
  velocity: number
  /** epoch ms — 메인과 렌더러가 같은 시스템 시계를 쓴다 */
  startedAt: number
}

export interface PetSpriteAnimation {
  row: number
  frames: number
  fps: number
}

/** 스프라이트 시트 — 프레임은 오른쪽을 보고, 애니메이션마다 한 행에 왼쪽부터 frames개 */
export interface PetSprite {
  /** `pack://<팩 id>/<파일>` */
  url: string
  frameWidth: number
  frameHeight: number
  /** 정수 배율 — 픽셀 아트를 흐리지 않고 키운다 */
  scale: number
  animations: { idle: PetSpriteAnimation; walk: PetSpriteAnimation }
}

/** userData/settings.json — 키는 secrets.json에 따로 */
export interface Settings {
  petVisible: boolean
  packId: string
}

export interface PackSummary {
  id: string
  name: string
}

export type SecretId = 'busServiceKey' | 'geminiApiKey'

/** 원문은 렌더러로 오지 않는다 — 저장 여부와 끝 4자리만 */
export interface SecretStatus {
  saved: boolean
  /** 저장됐지만 이 PC에서 복호화할 수 없으면 null */
  last4: string | null
}

export type SaveSecretResult =
  | { ok: true; status: SecretStatus }
  | { ok: false; reason: 'encryption-unavailable' }

/** preload 구현과 렌더러 타입 선언이 함께 참조 — 기능 추가 시 시그니처를 여기에 먼저 정의 */
export interface DesktopPetApi {
  /** 메인 창에서만 허용 */
  settings: {
    get(): Promise<Settings>
    /** 반환값을 호출하면 구독 해제 */
    onChange(listener: (settings: Settings) => void): () => void
  }
  /** 메인 창에서만 허용 */
  packs: {
    list(): Promise<PackSummary[]>
    /** 팩을 읽지 못하면 false — 설정은 그대로 */
    select(id: string): Promise<boolean>
  }
  /** 메인 창에서만 허용 */
  secrets: {
    getStatus(id: SecretId): Promise<SecretStatus>
    /** 키는 이때 한 번만 메인으로 간다 */
    save(id: SecretId, value: string): Promise<SaveSecretResult>
    remove(id: SecretId): Promise<SecretStatus>
  }
  pet: {
    /** 메인 창에서만 허용 — 현재 값은 settings.petVisible */
    setVisible(visible: boolean): Promise<void>
    /** 오버레이에서만 허용, 팩을 못 읽으면 null */
    getSprite(): Promise<PetSprite | null>
    onSpriteChange(listener: (sprite: PetSprite) => void): () => void
    /** 오버레이에서만 허용 */
    getMotion(): Promise<PetMotion | null>
    onMotionChange(listener: (motion: PetMotion) => void): () => void
    /** 오버레이에서만 허용 */
    openMainWindow(): Promise<void>
    /** 오버레이에서만 허용 */
    showContextMenu(): Promise<void>
  }
}
