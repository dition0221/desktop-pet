import type { BusStop } from '@preload/api'

interface StopListProps {
  stops: BusStop[]
  onSelect(stop: BusStop): void
}

function StopList({ stops, onSelect }: StopListProps): React.JSX.Element {
  return (
    <ul className="flex flex-col">
      {stops.map((stop) => (
        <li key={stop.id}>
          <button
            type="button"
            onClick={() => onSelect(stop)}
            className="flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
          >
            <span className="truncate">{stop.name}</span>
            <span className="shrink-0 text-neutral-400 text-xs">{stop.number}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default StopList
