import type { DraggableSyntheticListeners } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableItem {
  ref(node: HTMLElement | null): void
  listeners: DraggableSyntheticListeners
  isDragging: boolean
  style: React.CSSProperties
}

/** 크기가 다른 카드끼리 자리를 바꿀 때 늘어나지 않게 이동만 적용한다 */
export function useSortableItem(id: string): SortableItem {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id })
  return {
    ref: setNodeRef,
    listeners,
    isDragging,
    style: { transform: CSS.Translate.toString(transform), transition }
  }
}
