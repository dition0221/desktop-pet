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
  /** 노선 즐겨찾기만 켤 수 있다 — 정류소 전체 노선을 알리면 말풍선이 쏟아진다 */
  alert: boolean
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

export interface BusArrival {
  routeId: string
  routeNumber: string
  /** 응답을 받은 시각(`StopArrivals.updatedAt`) 기준 남은 시간 */
  secondsLeft: number
  stopsLeft: number | null
  /** 차량 번호 — 같은 버스를 알아보는 데 쓴다 */
  vehicleId: string | null
  /** 행선지 — 같은 노선의 방향을 구분한다 */
  destination: string | null
}

export interface StopArrivals {
  arrivals: BusArrival[]
  /** 마지막으로 성공한 시각 — 실패해도 이전 결과는 남긴다 */
  updatedAt: number | null
  error: BusErrorCode | null
}

/** idle = 볼 창이 없어 쉼, backoff = 연속 실패로 간격을 늘림, key-error = 키를 바꿀 때까지 멈춤 */
export type ArrivalPollStatus =
  | 'idle'
  | 'polling'
  | 'no-favorites'
  | 'outside-hours'
  | 'quota-exceeded'
  | 'backoff'
  | 'key-error'

export interface ArrivalsSnapshot {
  status: ArrivalPollStatus
  /** 정류소 ID별 */
  stops: Record<string, StopArrivals>
  nextPollAt: number | null
}

export interface BusPollSettings {
  intervalSec: 30 | 60 | 120 | 300
  /** `HH:MM` — end가 start보다 이르면 자정을 넘고, 같으면 하루 종일 */
  activeHours: { start: string; end: string }
  /** 도착 몇 분 전에 펫이 알려 줄지 */
  alertMinutes: 3 | 5 | 10 | 15
}

export interface PetSpeech {
  text: string
  durationMs: number
}

/** stop·route는 TAGO, arrival은 대전시 도착정보 */
export type BusApiName = 'stop' | 'route' | 'arrival'

/** userData/settings.json — 키는 secrets.json에 따로 */
export interface Settings {
  petVisible: boolean
  packId: string
  busFavorites: BusFavorite[]
  busPoll: BusPollSettings
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
    /** 즐겨찾기 정류소 도착 정보 — 메인 창이 보이는 동안만 메인이 주기적으로 갱신한다 */
    getArrivals(): Promise<ArrivalsSnapshot>
    onArrivalsChange(listener: (snapshot: ArrivalsSnapshot) => void): () => void
    setPollSettings(settings: BusPollSettings): Promise<void>
    /** 알림이 켜진 즐겨찾기는 메인 창을 닫아도 운행 시간 동안 조회한다 */
    setFavoriteAlert(stopId: string, routeId: string, enabled: boolean): Promise<void>
  }
  pet: {
    /** 메인 창에서만 허용 — 현재 값은 settings.petVisible */
    setVisible(visible: boolean): Promise<void>
    /** 오버레이에서만 허용, 팩을 못 읽으면 null */
    getSprite(): Promise<PetSprite | null>
    onSpriteChange(listener: (sprite: PetSprite) => void): () => void
    /** 오버레이 전용 — 버스 도착 알림 등 펫 말풍선 */
    onSpeech(listener: (speech: PetSpeech) => void): () => void
    /** 오버레이에서만 허용 */
    getMotion(): Promise<PetMotion | null>
    onMotionChange(listener: (motion: PetMotion) => void): () => void
    /** 오버레이에서만 허용 */
    openMainWindow(): Promise<void>
    /** 오버레이에서만 허용 */
    showContextMenu(): Promise<void>
  }
}
