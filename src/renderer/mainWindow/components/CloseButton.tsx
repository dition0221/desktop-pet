interface CloseButtonProps {
  label: string
  onClick(): void
  className?: string
}

function CloseButton({ label, onClick, className = '' }: CloseButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`shrink-0 rounded p-1 text-neutral-400 transition-colors hover:text-red-500 ${className}`}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
        <path
          d="M4 4l8 8M12 4l-8 8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}

export default CloseButton
