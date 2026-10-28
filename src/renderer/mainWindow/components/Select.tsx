import type { SelectHTMLAttributes } from 'react'

function Select({
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>): React.JSX.Element {
  return (
    <select
      {...props}
      className={`rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-200 ${className}`}
    />
  )
}

export default Select
