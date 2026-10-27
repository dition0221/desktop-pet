import type {
  BusFavorite,
  BusResult,
  BusRoute,
  BusRouteStop,
  BusStop,
  BusStopSearch,
  Settings
} from '@preload/api'
import { BUS_ERROR_MESSAGES } from '@renderer/mainWindow/busErrorMessages'
import BusMap, { type FocusRequest, type MapCenter } from '@renderer/mainWindow/components/BusMap'
import Button from '@renderer/mainWindow/components/Button'
import CloseButton from '@renderer/mainWindow/components/CloseButton'
import FavoriteList from '@renderer/mainWindow/components/FavoriteList'
import Spinner from '@renderer/mainWindow/components/Spinner'
import StopDetails from '@renderer/mainWindow/components/StopDetails'
import StopList from '@renderer/mainWindow/components/StopList'
import TextInput from '@renderer/mainWindow/components/TextInput'
import { useSettings } from '@renderer/mainWindow/hooks/useSettings'
import { createFileRoute } from '@tanstack/react-router'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'

const DAEJEON_CITY_HALL = { lat: 36.3504, lng: 127.3845 }
const INITIAL_ZOOM = 16
/** 이보다 멀리서 보면 반경 500m 마커가 화면 일부에만 찍혀 오해를 부른다 */
const MIN_STOP_ZOOM = 15
const NEARBY_DEBOUNCE_MS = 400
/** 이보다 덜 움직였으면 거의 같은 정류소가 나옴 — 호출 한도를 아낀다 */
const NEARBY_REFETCH_DISTANCE_M = 150

/** 다른 탭에 다녀와도 보던 곳에서 다시 시작 — 앱을 다시 켜면 처음 위치 */
let lastMapView: MapCenter | null = null

export const Route = createFileRoute('/bus')({
  component: BusScreen
})

interface SearchState {
  query: string
  /** null = 검색 중 */
  result: BusStopSearch | null
}

/** 위도 36° 근처 근사 — 다시 조회할지 판단하는 데만 쓴다 */
function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return Math.hypot((a.lat - b.lat) * 111_000, (a.lng - b.lng) * 89_000)
}

function resultCountLabel({ stops, truncated }: BusStopSearch): string {
  return `${stops.length}곳${truncated ? '+' : ''}`
}

function uniqueStops(stops: BusStop[]): BusStop[] {
  return [...new Map(stops.map((stop) => [stop.id, stop])).values()]
}

function BusScreen(): React.JSX.Element {
  const settings = useSettings()
  return settings ? <BusExplorer settings={settings} /> : <section className="p-8" />
}

function BusExplorer({ settings }: { settings: Settings }): React.JSX.Element {
  const favorites = settings.busFavorites
  const [initialView] = useState<MapCenter>(
    () => lastMapView ?? { ...(favorites[0]?.stop ?? DAEJEON_CITY_HALL), zoom: INITIAL_ZOOM }
  )

  const [zoom, setZoom] = useState<number | null>(null)
  const [nearby, setNearby] = useState<BusStop[]>([])
  const [selected, setSelected] = useState<BusStop | null>(null)
  const [routes, setRoutes] = useState<BusRoute[] | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [routePath, setRoutePath] = useState<BusRouteStop[]>([])
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const [fitRouteSeq, setFitRouteSeq] = useState(0)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<SearchState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const nearbyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastNearbyCenter = useRef<{ lat: number; lng: number } | null>(null)
  // 응답이 늦게 온 이전 요청이 최신 화면을 덮지 않게 요청마다 번호를 붙인다
  const latestRequest = useRef({ nearby: 0, routes: 0, path: 0, search: 0 })

  const favoriteStopIds = useMemo(
    () => new Set(favorites.filter((f) => !f.route).map((f) => f.stop.id)),
    [favorites]
  )
  const favoriteRouteIds = useMemo(
    () =>
      new Set(
        favorites.flatMap((f) => (f.route && f.stop.id === selected?.id ? [f.route.id] : []))
      ),
    [favorites, selected]
  )
  const markedStopIds = useMemo(() => new Set(favorites.map((f) => f.stop.id)), [favorites])

  const unwrap = <T,>(result: BusResult<T>): T | null => {
    if (result.ok) {
      setError(null)
      return result.data
    }
    setError(BUS_ERROR_MESSAGES[result.error])
    return null
  }

  useEffect(() => () => clearTimeout(nearbyTimer.current), [])

  const loadNearby = async (center: MapCenter): Promise<void> => {
    const request = ++latestRequest.current.nearby
    try {
      const result = await window.api.bus.nearbyStops(center.lat, center.lng)
      if (request !== latestRequest.current.nearby) return
      const stops = unwrap(result)
      // 실패하면 기록하지 않아 조금만 움직여도 다시 시도한다
      if (stops) lastNearbyCenter.current = center
      setNearby(stops ?? [])
    } catch {
      if (request === latestRequest.current.nearby) setError(BUS_ERROR_MESSAGES.unknown)
    }
  }

  const handleMoveEnd = (center: MapCenter): void => {
    lastMapView = center
    setZoom(center.zoom)
    clearTimeout(nearbyTimer.current)
    if (center.zoom < MIN_STOP_ZOOM) {
      latestRequest.current.nearby++
      setNearby([])
      lastNearbyCenter.current = null
      return
    }
    const last = lastNearbyCenter.current
    if (last && distanceM(last, center) < NEARBY_REFETCH_DISTANCE_M) return
    nearbyTimer.current = setTimeout(() => void loadNearby(center), NEARBY_DEBOUNCE_MS)
  }

  const showRoute = async (routeId: string | null): Promise<void> => {
    const request = ++latestRequest.current.path
    setSelectedRouteId(routeId)
    if (!routeId) {
      setRoutePath([])
      return
    }
    const result = await window.api.bus.routePath(routeId)
    if (request !== latestRequest.current.path) return
    setRoutePath(unwrap(result) ?? [])
  }

  const selectStop = async (stop: BusStop, routeId: string | null = null): Promise<void> => {
    setSelected(stop)
    setRoutes(null)
    void showRoute(routeId)
    const request = ++latestRequest.current.routes
    const result = await window.api.bus.stopRoutes(stop.id)
    if (request !== latestRequest.current.routes) return
    setRoutes(unwrap(result) ?? [])
  }

  const clearSelection = (): void => {
    latestRequest.current.routes++
    setSelected(null)
    setRoutes(null)
    void showRoute(null)
  }

  const toggleStop = (stop: BusStop): void => {
    if (stop.id === selected?.id) clearSelection()
    else void selectStop(stop)
  }

  const focusStop = (stop: BusStop, routeId: string | null = null): void => {
    setFocusRequest((previous) => ({ stop, seq: (previous?.seq ?? 0) + 1 }))
    void selectStop(stop, routeId)
  }

  const toggleFavorite = async (stop: BusStop, route: BusRoute | null): Promise<void> => {
    const routeId = route?.id ?? null
    const saved = favorites.some(
      (favorite) => favorite.stop.id === stop.id && (favorite.route?.id ?? null) === routeId
    )
    if (saved) {
      await window.api.bus.removeFavorite(stop.id, routeId)
      return
    }
    const result = await window.api.bus.addFavorite({
      stop,
      route: route && { id: route.id, number: route.number }
    })
    if (!result.ok) setError(`즐겨찾기는 ${result.limit}개까지 저장할 수 있어요`)
  }

  const submitSearch = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    const name = query.trim()
    if (!name) return
    const request = ++latestRequest.current.search
    setSearch({ query: name, result: null })
    const result = await window.api.bus.searchStops(name)
    if (request !== latestRequest.current.search) return
    setSearch({ query: name, result: unwrap(result) ?? { stops: [], truncated: false } })
  }

  const closeSearch = (): void => {
    latestRequest.current.search++
    setSearch(null)
  }

  const mapStops = useMemo(
    () =>
      uniqueStops([
        ...nearby,
        ...favorites.map((favorite) => favorite.stop),
        ...(search?.result?.stops ?? []),
        ...(selected ? [selected] : [])
      ]),
    [nearby, favorites, search, selected]
  )
  const zoomedOut = zoom !== null && zoom < MIN_STOP_ZOOM
  const searching = search !== null && search.result === null

  return (
    <section className="flex h-full">
      <div className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-neutral-200 border-r p-4">
        <h1 className="font-bold text-xl">버스</h1>

        <div className="flex flex-col gap-2">
          <form onSubmit={submitSearch} className="flex gap-2">
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={30}
              placeholder="정류소 이름 검색"
              className="flex-1"
            />
            <Button type="submit" variant="primary" busy={searching} disabled={!query.trim()}>
              검색
            </Button>
          </form>

          {search && (
            <div className="flex flex-col gap-1 rounded-md border border-neutral-200 bg-white p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1.5 font-medium text-neutral-500 text-xs">
                  <span className="truncate">‘{search.query}’</span>
                  {search.result === null ? (
                    <Spinner className="size-3.5 shrink-0 text-primary-600" />
                  ) : (
                    <span className="shrink-0">검색 결과 {resultCountLabel(search.result)}</span>
                  )}
                </p>
                <CloseButton label="검색 결과 닫기" onClick={closeSearch} />
              </div>
              {search.result?.stops.length === 0 && (
                <p className="px-2 py-1 text-neutral-400 text-sm">일치하는 정류소가 없어요</p>
              )}
              {search.result && search.result.stops.length > 0 && (
                <div className="max-h-56 overflow-y-auto">
                  <StopList stops={search.result.stops} onSelect={(stop) => focusStop(stop)} />
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="text-red-600 text-sm">
            {error}
          </p>
        )}

        {selected && (
          <StopDetails
            stop={selected}
            favorite={favoriteStopIds.has(selected.id)}
            favoriteRouteIds={favoriteRouteIds}
            routes={routes}
            selectedRouteId={selectedRouteId}
            onToggleFavorite={(route) => void toggleFavorite(selected, route)}
            onSelectRoute={(route) =>
              void showRoute(route.id === selectedRouteId ? null : route.id)
            }
            onFitRoute={() => setFitRouteSeq((seq) => seq + 1)}
          />
        )}

        <div className="flex flex-col gap-1">
          <p className="font-medium text-neutral-500 text-xs">즐겨찾기</p>
          {favorites.length === 0 ? (
            <p className="text-neutral-400 text-sm">정류소나 노선의 ☆을 눌러 추가하세요</p>
          ) : (
            <FavoriteList
              favorites={favorites}
              onSelect={(favorite: BusFavorite) => focusStop(favorite.stop, favorite.route?.id)}
              onRemove={(favorite) =>
                void window.api.bus.removeFavorite(favorite.stop.id, favorite.route?.id ?? null)
              }
            />
          )}
        </div>
      </div>

      <div className="relative min-w-0 flex-1">
        <BusMap
          initialView={initialView}
          stops={mapStops}
          favoriteStopIds={markedStopIds}
          selectedStopId={selected?.id ?? null}
          routePath={routePath}
          focusRequest={focusRequest}
          fitRouteSeq={fitRouteSeq}
          showRadius={!zoomedOut}
          onMoveEnd={handleMoveEnd}
          onSelectStop={toggleStop}
        />
        {zoomedOut && (
          <p className="-translate-x-1/2 pointer-events-none absolute top-3 left-1/2 z-1000 rounded-md bg-white/90 px-3 py-1.5 text-sm shadow">
            더 확대하면 근처 정류소가 보여요
          </p>
        )}
      </div>
    </section>
  )
}
