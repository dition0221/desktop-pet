import type { InputHTMLAttributes } from 'react'

function TextInput({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return (
    <input
      {...props}
      className={`min-w-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-200 ${className}`}
    />
  )
}

export default TextInput
