import Spinner from '@renderer/mainWindow/components/Spinner'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline'
  busy?: boolean
}

function Button({
  variant = 'outline',
  busy = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`relative inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
        variant === 'primary'
          ? 'border-primary-700 bg-primary-700 text-white hover:bg-primary-800'
          : 'border-neutral-300 bg-white hover:bg-neutral-100'
      } ${busy ? 'cursor-progress' : ''} ${className}`}
    >
      <span className={busy ? 'invisible' : ''}>{children}</span>
      {busy && <Spinner className="absolute size-4" />}
    </button>
  )
}

export default Button
