import type { BusRoute, BusStop } from '@preload/api'
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

function StarButton({
  active,
  label,
  onClick
}: {
  active: boolean
  label: string
  onClick(): void
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-md px-1.5 text-lg leading-7 transition-colors ${active ? 'text-primary-600 hover:text-primary-700' : 'text-neutral-300 hover:text-primary-500'}`}
    >
      {active ? '★' : '☆'}
    </button>
  )
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
        <StarButton
          active={props.favorite}
          label="정류소 즐겨찾기"
          onClick={() => props.onToggleFavorite(null)}
        />
      </div>

      <div className="flex h-6 items-center justify-between">
        <p className="font-medium text-neutral-500 text-xs">지나는 노선</p>
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
            <StarButton
              active={props.favoriteRouteIds.has(route.id)}
              label={`${route.number}번 즐겨찾기`}
              onClick={() => props.onToggleFavorite(route)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default StopDetails
