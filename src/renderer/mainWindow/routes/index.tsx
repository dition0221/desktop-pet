import type { ArrivalsSnapshot, Settings } from '@preload/api'
import FavoriteArrivalCard from '@renderer/mainWindow/components/FavoriteArrivalCard'
import Page from '@renderer/mainWindow/components/Page'
import SortableFavorites from '@renderer/mainWindow/components/SortableFavorites'
import { useArrivals } from '@renderer/mainWindow/hooks/useArrivals'
import { favoriteId } from '@renderer/mainWindow/hooks/useFavoriteOrder'
import { useNow } from '@renderer/mainWindow/hooks/useNow'
import { useSettings } from '@renderer/mainWindow/hooks/useSettings'
import { createFileRoute, Link } from '@tanstack/react-router'

/** 남은 시간을 응답 사이에도 줄여 보여 줄 간격 */
const COUNTDOWN_TICK_MS = 10_000

export const Route = createFileRoute('/')({
  component: HomeScreen
})

function statusText(snapshot: ArrivalsSnapshot, settings: Settings): string | null {
  switch (snapshot.status) {
    case 'outside-hours':
      return `운행 시간이 아니에요 — ${settings.busPoll.activeHours.start}부터 다시 확인해요`
    case 'quota-exceeded':
      return '오늘 호출 한도를 다 써서 내일 다시 확인해요'
    case 'backoff':
      return '도착 정보를 불러오지 못해 잠시 뒤 다시 시도해요'
    case 'key-error':
      return '버스 키나 활용신청을 확인해 주세요 — 설정에서 키를 다시 저장하면 바로 다시 불러와요'
    default:
      return null
  }
}

function lastUpdatedText(snapshot: ArrivalsSnapshot): string | null {
  const times = Object.values(snapshot.stops).flatMap((stop) =>
    stop.updatedAt === null ? [] : [stop.updatedAt]
  )
  if (times.length === 0) return null
  const time = new Date(Math.max(...times)).toLocaleTimeString('ko-KR', { timeStyle: 'short' })
  return `${time} 기준`
}

function HomeScreen(): React.JSX.Element {
  const settings = useSettings()
  const snapshot = useArrivals()
  const now = useNow(COUNTDOWN_TICK_MS)
  const favorites = settings?.busFavorites ?? []

  return (
    <Page title="홈">
      {settings && favorites.length === 0 && (
        <p className="text-neutral-500 text-sm">
          <Link to="/bus" className="text-primary-700 underline-offset-2 hover:underline">
            버스
          </Link>{' '}
          페이지에서 정류소를 즐겨찾기하면 여기에 도착 정보가 나와요
        </p>
      )}

      {settings && snapshot && favorites.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">즐겨찾기 도착 정보</h2>
            <span className="text-neutral-400 text-xs">{lastUpdatedText(snapshot)}</span>
          </div>
          {statusText(snapshot, settings) && (
            <p className="text-neutral-500 text-sm">{statusText(snapshot, settings)}</p>
          )}
          <SortableFavorites favorites={favorites} layout="grid">
            {(items) => (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
                {items.map((favorite) => (
                  <FavoriteArrivalCard
                    key={favoriteId(favorite)}
                    favorite={favorite}
                    stop={snapshot.stops[favorite.stop.id]}
                    polling={snapshot.status === 'polling'}
                    alertMinutes={settings.busPoll.alertMinutes}
                    now={now}
                  />
                ))}
              </div>
            )}
          </SortableFavorites>
        </section>
      )}
    </Page>
  )
}
