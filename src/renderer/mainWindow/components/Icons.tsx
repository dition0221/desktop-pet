interface IconProps {
  filled: boolean
}

export function StarIcon({ filled }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4.5">
      <path
        d="M10 2.2l2.35 4.9 5.35.68-3.92 3.7.98 5.3L10 14.2l-4.76 2.58.98-5.3L2.3 7.78l5.35-.68z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BellIcon({ filled }: IconProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
      <path
        d="M10 2.5a5 5 0 0 0-5 5v3.2L3.6 13.4a.8.8 0 0 0 .7 1.1h11.4a.8.8 0 0 0 .7-1.1L15 10.7V7.5a5 5 0 0 0-5-5Zm-2 13.5a2 2 0 0 0 4 0"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
