import type { BusFavorite, StopArrivals } from '@preload/api'
import { arrivalLabel, favoriteArrivals } from '@renderer/mainWindow/arrivalFormat'
import { BUS_ERROR_MESSAGES } from '@renderer/mainWindow/busErrorMessages'
import Spinner from '@renderer/mainWindow/components/Spinner'

/** 정류소 즐겨찾기는 노선이 많을 수 있어 가까운 순으로 이만큼만 */
const MAX_ROWS = 5

interface FavoriteArrivalCardProps {
  favorite: BusFavorite
  /** undefined = 아직 한 번도 조회하지 않음 */
  stop: StopArrivals | undefined
  /** 조회 주기가 돌고 있는지 — 운행 시간 밖이면 결과 자리를 비워 둔다 */
  polling: boolean
  now: number
}

function FavoriteArrivalCard({
  favorite,
  stop,
  polling,
  now
}: FavoriteArrivalCardProps): React.JSX.Element {
  const updatedAt = stop?.updatedAt ?? null
  const rows =
    updatedAt === null
      ? []
      : favoriteArrivals(favorite, stop).flatMap((arrival) => {
          const label = arrivalLabel(arrival, updatedAt, now)
          return label ? [{ arrival, label }] : []
        })

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <header className="flex items-baseline gap-1.5">
        {favorite.route && (
          <span className="shrink-0 rounded bg-primary-100 px-1.5 font-semibold text-primary-800 text-xs">
            {favorite.route.number}
          </span>
        )}
        <h2 className="truncate font-semibold">{favorite.stop.name}</h2>
        <span className="shrink-0 text-neutral-400 text-xs">{favorite.stop.number}</span>
      </header>

      {stop === undefined && polling && <Spinner className="size-4 text-primary-600" />}
      {stop?.error && (
        <p role="alert" className="text-red-600 text-sm">
          {BUS_ERROR_MESSAGES[stop.error]}
        </p>
      )}
      {stop && !stop.error && rows.length === 0 && (
        <p className="text-neutral-400 text-sm">도착 예정 버스가 없어요</p>
      )}

      {rows.length > 0 && (
        // 이번 조회가 실패했으면 지난 결과라는 걸 흐리게 보여 준다
        <ul className={`flex flex-col gap-1.5 ${stop?.error ? 'opacity-50' : ''}`}>
          {rows.slice(0, MAX_ROWS).map(({ arrival, label }) => (
            <li
              key={`${arrival.routeId}:${arrival.secondsLeft}`}
              className="flex items-baseline justify-between gap-2 text-sm"
            >
              <span className="truncate">
                <span className="font-semibold">{arrival.routeNumber}</span>
                {arrival.destination && (
                  <span className="ml-1 text-neutral-400 text-xs">→ {arrival.destination}</span>
                )}
              </span>
              <span className="shrink-0">
                <span className="font-semibold text-primary-700">{label}</span>
                {arrival.stopsLeft !== null && (
                  <span className="ml-1.5 text-neutral-400 text-xs">
                    {arrival.stopsLeft}정류장 전
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default FavoriteArrivalCard
