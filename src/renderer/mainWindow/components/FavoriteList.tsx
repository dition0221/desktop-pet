import type { BusFavorite } from '@preload/api'
import CloseButton from '@renderer/mainWindow/components/CloseButton'
import RouteBadge from '@renderer/mainWindow/components/RouteBadge'

interface FavoriteListProps {
  favorites: BusFavorite[]
  onSelect(favorite: BusFavorite): void
  onRemove(favorite: BusFavorite): void
}

function FavoriteList({ favorites, onSelect, onRemove }: FavoriteListProps): React.JSX.Element {
  return (
    <ul className="flex flex-col">
      {favorites.map((favorite) => (
        <li
          key={`${favorite.stop.id}:${favorite.route?.id ?? ''}`}
          className="group flex items-center rounded-md transition-colors hover:bg-neutral-100"
        >
          <button
            type="button"
            onClick={() => onSelect(favorite)}
            className="flex min-w-0 flex-1 items-baseline gap-1.5 px-2 py-1.5 text-left text-sm"
          >
            {favorite.route && <RouteBadge number={favorite.route.number} />}
            <span className="truncate">{favorite.stop.name}</span>
            <span className="shrink-0 text-neutral-400 text-xs">{favorite.stop.number}</span>
          </button>
          <CloseButton
            label="즐겨찾기 삭제"
            onClick={() => onRemove(favorite)}
            className="mr-1 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
          />
        </li>
      ))}
    </ul>
  )
}

export default FavoriteList
