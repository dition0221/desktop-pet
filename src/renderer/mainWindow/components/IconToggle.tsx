interface IconToggleProps {
  active: boolean
  label: string
  icon(props: { filled: boolean }): React.JSX.Element
  onChange(active: boolean): void
}

function IconToggle({ active, label, icon: Icon, onChange }: IconToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={() => onChange(!active)}
      className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${active ? 'text-primary-600 hover:text-primary-700' : 'text-neutral-300 hover:text-primary-500'}`}
    >
      <Icon filled={active} />
    </button>
  )
}

export default IconToggle
