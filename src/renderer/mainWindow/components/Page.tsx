interface PageProps {
  title: string
  children?: React.ReactNode
}

function Page({ title, children }: PageProps): React.JSX.Element {
  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="font-bold text-xl">{title}</h1>
      {children}
    </section>
  )
}

export default Page
