interface SectionLabelProps {
  children: React.ReactNode
}

function SectionLabel({ children }: SectionLabelProps): React.JSX.Element {
  return <p className="font-medium text-neutral-500 text-xs">{children}</p>
}

export default SectionLabel
