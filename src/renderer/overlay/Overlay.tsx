import Pet from '@renderer/overlay/Pet'

function Overlay(): React.JSX.Element {
  return (
    <main className="relative h-screen overflow-hidden select-none">
      <Pet />
    </main>
  )
}

export default Overlay
