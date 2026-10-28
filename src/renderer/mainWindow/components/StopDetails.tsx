import type { BusRoute, BusStop } from '@preload/api'
import { StarIcon } from '@renderer/mainWindow/components/Icons'
import IconToggle from '@renderer/mainWindow/components/IconToggle'
import SectionLabel from '@renderer/mainWindow/components/SectionLabel'
import Spinner from '@renderer/mainWindow/components/Spinner'

interface StopDetailsProps {
  stop: BusStop
  favorite: boolean
  favoriteRouteIds: ReadonlySet<string>
  /** null = 불러오는 중 */
  routes: BusRoute[] | null
  selectedRouteId: string | null
  onToggleFavorite(route: BusRoute | null): void
  onSelectRoute(route: BusRoute): void
  onFitRoute(): void
}

function StopDetails(props: StopDetailsProps): React.JSX.Element {
  const { stop, routes, selectedRouteId } = props

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{stop.name}</p>
          {stop.number && <p className="text-neutral-500 text-xs">정류소번호 {stop.number}</p>}
        </div>
        <IconToggle
          active={props.favorite}
          label="정류소 즐겨찾기"
          onChange={() => props.onToggleFavorite(null)}
          icon={StarIcon}
        />
      </div>

      <div className="flex h-6 items-center justify-between">
        <SectionLabel>지나는 노선</SectionLabel>
        {selectedRouteId && (
          <button
            type="button"
            onClick={props.onFitRoute}
            className="rounded-md px-2 py-0.5 text-primary-700 text-xs transition-colors hover:bg-primary-50"
          >
            노선 전체 보기
          </button>
        )}
      </div>
      {routes === null && <Spinner className="size-4 text-primary-600" />}
      {routes?.length === 0 && <p className="text-neutral-400 text-sm">지나는 노선이 없어요</p>}
      <ul className="flex flex-col">
        {routes?.map((route) => (
          <li
            key={route.id}
            className={`flex items-center rounded-md transition-colors ${route.id === selectedRouteId ? 'bg-primary-100' : 'hover:bg-neutral-100'}`}
          >
            <button
              type="button"
              onClick={() => props.onSelectRoute(route)}
              className="flex min-w-0 flex-1 flex-col px-2 py-1.5 text-left text-sm"
            >
              <span>
                <span className="font-semibold">{route.number}</span>
                {route.type && <span className="ml-1 text-neutral-400 text-xs">{route.type}</span>}
              </span>
              {route.start && route.end && (
                <span className="truncate text-neutral-500 text-xs">
                  {route.start} ↔ {route.end}
                </span>
              )}
            </button>
            <IconToggle
              active={props.favoriteRouteIds.has(route.id)}
              label={`${route.number}번 즐겨찾기`}
              onChange={() => props.onToggleFavorite(route)}
              icon={StarIcon}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default StopDetails
