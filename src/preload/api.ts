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

export interface BusStop {
  /** TAGO 정류소 ID (`DJB…`) */
  id: string
  name: string
  /** 정류소 표지판의 5자리 번호 */
  number: string | null
  lat: number
  lng: number
}

export interface BusRoute {
  /** TAGO 노선 ID (`DJB…`) */
  id: string
  number: string
  type: string | null
  start: string | null
  end: string | null
}

export interface BusRouteStop extends BusStop {
  order: number
  /** 상행·하행 구분 — 선 색을 나누는 데만 쓴다 */
  updown: number
}

/** 정류소만 고르거나, 그 정류소의 특정 노선까지 고른다 */
export interface BusFavorite {
  stop: BusStop
  route: Pick<BusRoute, 'id' | 'number'> | null
}

export type BusErrorCode =
  | 'no-key'
  | 'invalid-key'
  | 'not-allowed'
  | 'quota-exceeded'
  | 'network'
  | 'unknown'

export type BusResult<T> = { ok: true; data: T } | { ok: false; error: BusErrorCode }

export interface BusStopSearch {
  stops: BusStop[]
  /** 한 번에 받는 수보다 결과가 많아 잘렸는지 */
  truncated: boolean
}

export type AddFavoriteResult = { ok: true } | { ok: false; reason: 'limit'; limit: number }

export type BusApiName = 'stop' | 'route' | 'arrival' | 'location'

/** userData/settings.json — 키는 secrets.json에 따로 */
export interface Settings {
  petVisible: boolean
  packId: string
  busFavorites: BusFavorite[]
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
  /** 메인 창에서만 허용 — 호출 한도(API당 일 10,000건)를 쓰므로 지도 이동 등은 렌더러에서 debounce */
  bus: {
    /** 사용하는 TAGO API마다 저장된 키로 가장 가벼운 조회를 해 본다 */
    testKey(): Promise<Record<BusApiName, BusErrorCode | 'ok'>>
    /** 반경 500m */
    nearbyStops(lat: number, lng: number): Promise<BusResult<BusStop[]>>
    searchStops(name: string): Promise<BusResult<BusStopSearch>>
    stopRoutes(stopId: string): Promise<BusResult<BusRoute[]>>
    routePath(routeId: string): Promise<BusResult<BusRouteStop[]>>
    /** 즐겨찾기 목록은 settings.busFavorites */
    addFavorite(favorite: BusFavorite): Promise<AddFavoriteResult>
    /** routeId가 null이면 정류소 즐겨찾기 */
    removeFavorite(stopId: string, routeId: string | null): Promise<void>
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
