import 'leaflet/dist/leaflet.css'
import '@renderer/mainWindow/components/busMap.css'
import type { BusRouteStop, BusStop } from '@preload/api'
import {
  type Circle,
  circle,
  map as createMap,
  divIcon,
  type LayerGroup,
  type Map as LeafletMap,
  latLngBounds,
  layerGroup,
  type Marker,
  marker,
  polyline,
  tileLayer
} from 'leaflet'
import { useEffect, useRef } from 'react'

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a>'
/** 근처 정류소 조회 반경 (TAGO 고정값) */
const NEARBY_RADIUS_M = 500
/** 정류소로 옮길 때 이보다 멀리서 보고 있었으면 이 정도로 당겨 준다 */
const MIN_FOCUS_ZOOM = 16
/** 메인 IPC가 받는 좌표 범위와 같게 — 지도 중심이 밖으로 나가면 근처 정류소 조회가 거부된다 */
const DAEJEON_BOUNDS = latLngBounds([35.9, 127], [36.7, 127.8])
const MIN_ZOOM = 11
const OPPOSITE_LEG_OPACITY = 0.3
/** 화살표끼리 겹치지 않게 이보다 짧은 구간(px)에는 그리지 않는다 */
const MIN_ARROW_SEGMENT_PX = 36
const ARROW_PANE = 'routeArrows'

const STOP_ICON = divIcon({
  className: 'bus-stop',
  html: '<span class="bus-stop-dot"><svg class="bus-stop-star" viewBox="0 0 10 10"><path d="M5 .65L6.15 3.67 9.37 3.83 6.85 5.85 7.7 8.97 5 7.2 2.3 8.97 3.15 5.85.63 3.83 3.85 3.67Z"/></svg></span>',
  iconSize: [36, 36],
  tooltipAnchor: [14, 0]
})

function arrowIcon(angleDeg: number): ReturnType<typeof divIcon> {
  return divIcon({
    className: 'route-arrow',
    html: `<span style="transform: rotate(${angleDeg.toFixed(1)}deg)"><svg viewBox="0 0 12 12"><path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`,
    iconSize: [12, 12]
  })
}

export interface MapCenter {
  lat: number
  lng: number
  zoom: number
}

/** 같은 정류소를 다시 골라도 지도를 옮기도록 요청마다 번호를 붙인다 */
export interface FocusRequest {
  stop: BusStop
  seq: number
}

interface BusMapProps {
  initialView: MapCenter
  stops: BusStop[]
  favoriteStopIds: ReadonlySet<string>
  selectedStopId: string | null
  routePath: BusRouteStop[]
  focusRequest: FocusRequest | null
  /** 바뀔 때마다 노선 전체가 보이게 맞춘다 — 노선을 고르는 것만으로는 화면을 옮기지 않는다 */
  fitRouteSeq: number
  showRadius: boolean
  onMoveEnd(center: MapCenter): void
  onSelectStop(stop: BusStop): void
}

/** 외부 응답인 정류소 이름은 HTML로 해석되지 않게 텍스트 노드로 넘긴다 */
function stopTooltip(stop: BusStop): HTMLElement {
  const label = document.createElement('span')
  label.textContent = stop.number ? `${stop.name} (${stop.number})` : stop.name
  return label
}

function drawRoute(
  map: LeafletMap,
  layer: LayerGroup,
  path: BusRouteStop[],
  selectedStopId: string | null
): void {
  layer.clearLayers()
  const activeLeg = path.find((stop) => stop.id === selectedStopId)?.updown
  const zoom = map.getZoom()

  for (const [updown, leg] of Map.groupBy(path, (stop) => stop.updown)) {
    const opacity = activeLeg === undefined || activeLeg === updown ? 1 : OPPOSITE_LEG_OPACITY
    polyline(
      leg.map((stop) => [stop.lat, stop.lng]),
      { className: 'bus-route', weight: 7, opacity, interactive: false }
    ).addTo(layer)

    for (let i = 0; i < leg.length - 1; i++) {
      const from = map.project([leg[i].lat, leg[i].lng], zoom)
      const to = map.project([leg[i + 1].lat, leg[i + 1].lng], zoom)
      if (from.distanceTo(to) < MIN_ARROW_SEGMENT_PX) continue
      const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
      const middle = map.unproject(from.add(to).divideBy(2), zoom)
      marker(middle, {
        icon: arrowIcon(angle),
        pane: ARROW_PANE,
        opacity,
        interactive: false,
        keyboard: false
      }).addTo(layer)
    }
  }
}

/** Leaflet은 DOM을 직접 다룸 — 지도·마커는 한 번 만들고 클래스만 바꿔 트랜지션을 살린다 */
function BusMap(props: BusMapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const stopLayerRef = useRef<LayerGroup | null>(null)
  const routeLayerRef = useRef<LayerGroup | null>(null)
  const radiusRef = useRef<Circle | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const propsRef = useRef(props)
  propsRef.current = props

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const { initialView } = propsRef.current
    const map = createMap(container, {
      center: [initialView.lat, initialView.lng],
      zoom: initialView.zoom,
      minZoom: MIN_ZOOM,
      maxBounds: DAEJEON_BOUNDS,
      maxBoundsViscosity: 1
    })
    map.attributionControl.setPrefix(false)
    // 노선 선(overlayPane 400)보다 위, 정류소(markerPane 600)보다 아래
    map.createPane(ARROW_PANE).style.zIndex = '450'
    tileLayer(OSM_TILE_URL, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map)
    routeLayerRef.current = layerGroup().addTo(map)
    stopLayerRef.current = layerGroup().addTo(map)
    radiusRef.current = circle(map.getCenter(), {
      radius: NEARBY_RADIUS_M,
      className: 'bus-radius',
      interactive: false
    })

    const reportMove = (): void => {
      const center = map.getCenter()
      radiusRef.current?.setLatLng(center)
      propsRef.current.onMoveEnd({ lat: center.lat, lng: center.lng, zoom: map.getZoom() })
    }
    // 확대 정도에 따라 화살표 간격이 달라져 다시 그린다
    const redrawRoute = (): void => {
      if (!routeLayerRef.current) return
      const { routePath, selectedStopId } = propsRef.current
      drawRoute(map, routeLayerRef.current, routePath, selectedStopId)
    }
    map.on('moveend', reportMove)
    map.on('zoomend', redrawRoute)
    mapRef.current = map
    reportMove()

    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    const markers = markersRef.current

    return () => {
      observer.disconnect()
      markers.clear()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !radiusRef.current) return
    if (props.showRadius) radiusRef.current.addTo(map)
    else radiusRef.current.remove()
  }, [props.showRadius])

  const { stops, favoriteStopIds, selectedStopId, routePath } = props

  useEffect(() => {
    const layer = stopLayerRef.current
    if (!layer) return
    const markers = markersRef.current
    const visibleIds = new Set(stops.map((stop) => stop.id))
    for (const [id, stopMarker] of markers) {
      if (visibleIds.has(id)) continue
      stopMarker.remove()
      markers.delete(id)
    }
    for (const stop of stops) {
      if (markers.has(stop.id)) continue
      const stopMarker = marker([stop.lat, stop.lng], { icon: STOP_ICON })
        .bindTooltip(stopTooltip(stop))
        .on('click', () => propsRef.current.onSelectStop(stop))
        .addTo(layer)
      markers.set(stop.id, stopMarker)
    }

    for (const [id, stopMarker] of markers) {
      const element = stopMarker.getElement()
      element?.classList.toggle('is-favorite', favoriteStopIds.has(id))
      element?.classList.toggle('is-selected', id === selectedStopId)
      stopMarker.setZIndexOffset(id === selectedStopId ? 1000 : 0)
    }
  }, [stops, favoriteStopIds, selectedStopId])

  useEffect(() => {
    const map = mapRef.current
    if (map && routeLayerRef.current) {
      drawRoute(map, routeLayerRef.current, routePath, selectedStopId)
    }
  }, [routePath, selectedStopId])

  useEffect(() => {
    const map = mapRef.current
    const path = propsRef.current.routePath
    if (!map || props.fitRouteSeq === 0 || path.length === 0) return
    map.fitBounds(latLngBounds(path.map((stop) => [stop.lat, stop.lng])), { padding: [24, 24] })
  }, [props.fitRouteSeq])

  useEffect(() => {
    const map = mapRef.current
    const stop = props.focusRequest?.stop
    if (!map || !stop) return
    if (map.getZoom() < MIN_FOCUS_ZOOM) map.setView([stop.lat, stop.lng], MIN_FOCUS_ZOOM)
    else map.panTo([stop.lat, stop.lng])
  }, [props.focusRequest])

  return <div ref={containerRef} className="size-full" />
}

export default BusMap
