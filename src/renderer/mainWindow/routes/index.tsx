import { usePetVisible } from '@renderer/mainWindow/hooks/usePetVisible'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomeScreen
})

function HomeScreen(): React.JSX.Element {
  const petVisible = usePetVisible()

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-50 text-neutral-800 select-none">
      <h1 className="font-bold text-2xl">desktop-pet</h1>
      <button
        type="button"
        disabled={petVisible === null}
        onClick={() => void window.api.pet.setVisible(!petVisible)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
      >
        {petVisible ? '펫 숨기기' : '펫 보이기'}
      </button>
    </main>
  )
}
