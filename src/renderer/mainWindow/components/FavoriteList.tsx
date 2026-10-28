import type { BusFavorite } from '@preload/api'
import CloseButton from '@renderer/mainWindow/components/CloseButton'
import RouteBadge from '@renderer/mainWindow/components/RouteBadge'
import SortableFavorites from '@renderer/mainWindow/components/SortableFavorites'
import { favoriteId } from '@renderer/mainWindow/hooks/useFavoriteOrder'
import { useSortableItem } from '@renderer/mainWindow/hooks/useSortableItem'

interface FavoriteListProps {
  favorites: BusFavorite[]
  onSelect(favorite: BusFavorite): void
  onRemove(favorite: BusFavorite): void
}

interface FavoriteListItemProps {
  favorite: BusFavorite
  onSelect(): void
  onRemove(): void
}

function FavoriteListItem({
  favorite,
  onSelect,
  onRemove
}: FavoriteListItemProps): React.JSX.Element {
  const { ref, listeners, isDragging, style } = useSortableItem(favoriteId(favorite))

  return (
    <li
      ref={ref}
      style={style}
      {...listeners}
      className={`group flex items-center rounded-md transition-colors hover:bg-neutral-100 ${isDragging ? 'z-10 bg-neutral-100 shadow-md' : ''}`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-baseline gap-1.5 px-2 py-1.5 text-left text-sm"
      >
        {favorite.route && <RouteBadge number={favorite.route.number} />}
        <span className="truncate">{favorite.stop.name}</span>
        <span className="shrink-0 text-neutral-400 text-xs">{favorite.stop.number}</span>
      </button>
      <CloseButton
        label="즐겨찾기 삭제"
        onClick={onRemove}
        className="mr-1 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
      />
    </li>
  )
}

function FavoriteList({ favorites, onSelect, onRemove }: FavoriteListProps): React.JSX.Element {
  return (
    <SortableFavorites favorites={favorites} layout="list">
      {(items) => (
        <ul className="flex flex-col">
          {items.map((favorite) => (
            <FavoriteListItem
              key={favoriteId(favorite)}
              favorite={favorite}
              onSelect={() => onSelect(favorite)}
              onRemove={() => onRemove(favorite)}
            />
          ))}
        </ul>
      )}
    </SortableFavorites>
  )
}

export default FavoriteList
