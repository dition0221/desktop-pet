interface RouteBadgeProps {
  number: string
}

function RouteBadge({ number }: RouteBadgeProps): React.JSX.Element {
  return (
    <span className="shrink-0 rounded bg-primary-100 px-1.5 font-semibold text-primary-800 text-xs">
      {number}
    </span>
  )
}

export default RouteBadge
