interface AlertToggleProps {
  active: boolean
  label: string
  onChange(active: boolean): void
}

function AlertToggle({ active, label, onChange }: AlertToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={() => onChange(!active)}
      className={`shrink-0 rounded-md p-1 transition-colors hover:bg-neutral-100 ${active ? 'text-primary-600' : 'text-neutral-300 hover:text-primary-500'}`}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
        <path
          d="M10 2.5a5 5 0 0 0-5 5v3.2L3.6 13.4a.8.8 0 0 0 .7 1.1h11.4a.8.8 0 0 0 .7-1.1L15 10.7V7.5a5 5 0 0 0-5-5Zm-2 13.5a2 2 0 0 0 4 0"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export default AlertToggle
