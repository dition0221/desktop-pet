import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

const NAV_ITEMS = [
  { to: '/', label: '홈' },
  { to: '/bus', label: '버스' },
  { to: '/chat', label: '대화' },
  { to: '/pet', label: '펫' },
  { to: '/settings', label: '설정' }
] as const

export const Route = createRootRoute({
  component: RootLayout
})

function RootLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-800 select-none">
      <nav className="flex w-44 shrink-0 flex-col gap-1 border-neutral-200 border-r bg-white p-3">
        <p className="px-3 py-2 font-bold">desktop-pet</p>
        {NAV_ITEMS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-neutral-100"
            activeProps={{ className: 'bg-primary-100 font-semibold text-primary-800' }}
          >
            {label}
          </Link>
        ))}
      </nav>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
