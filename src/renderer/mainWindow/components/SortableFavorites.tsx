import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  restrictToFirstScrollableAncestor,
  restrictToParentElement,
  restrictToVerticalAxis
} from '@dnd-kit/modifiers'
import {
  rectSortingStrategy,
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import type { BusFavorite } from '@preload/api'
import { favoriteId, useFavoriteOrder } from '@renderer/mainWindow/hooks/useFavoriteOrder'
import { useMemo } from 'react'

/** 클릭과 구분 — 이만큼 끌어야 드래그로 본다 */
const DRAG_START_DISTANCE_PX = 5
const LAYOUTS = {
  /** 스크롤 영역 밖으로 끌면 옮겨진 카드가 스크롤 범위를 넓혀 자동 스크롤이 끝나지 않는다 */
  grid: {
    modifiers: [restrictToFirstScrollableAncestor],
    strategy: rectSortingStrategy,
    autoScroll: true
  },
  /** 드래그 중 스크롤하면 목록 경계를 다시 재지 않아 어긋난다 — 목록이 짧아 스크롤 없이 쓴다 */
  list: {
    modifiers: [restrictToVerticalAxis, restrictToParentElement],
    strategy: verticalListSortingStrategy,
    autoScroll: false
  }
}

interface SortableFavoritesProps {
  favorites: BusFavorite[]
  /** list = 세로 목록이라 위아래로만 끌린다 */
  layout: 'grid' | 'list'
  children(favorites: BusFavorite[]): React.ReactNode
}

function SortableFavorites({
  favorites,
  layout,
  children
}: SortableFavoritesProps): React.JSX.Element {
  const { items, move } = useFavoriteOrder(favorites)
  // 렌더마다 새 배열이면 dnd-kit이 목록이 바뀐 줄 알고 되돌아가는 애니메이션을 끊는다
  const ids = useMemo(() => items.map(favoriteId), [items])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_START_DISTANCE_PX } })
  )
  const { modifiers, strategy, autoScroll } = LAYOUTS[layout]

  const setDragging = (dragging: boolean): void => {
    document.documentElement.toggleAttribute('data-dragging', dragging)
  }

  const onDragEnd = ({ active, over }: DragEndEvent): void => {
    setDragging(false)
    if (over) move(String(active.id), String(over.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={modifiers}
      autoScroll={autoScroll}
      onDragStart={() => setDragging(true)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(false)}
    >
      <SortableContext items={ids} strategy={strategy}>
        {children(items)}
      </SortableContext>
    </DndContext>
  )
}

export default SortableFavorites
