interface ErrorTextProps {
  children: React.ReactNode
}

function ErrorText({ children }: ErrorTextProps): React.JSX.Element {
  return (
    <p role="alert" className="text-red-600 text-sm">
      {children}
    </p>
  )
}

export default ErrorText
