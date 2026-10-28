import type { FileRouteTypes } from '@renderer/mainWindow/routeTree.gen'
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

interface NavItem {
  to: FileRouteTypes['to']
  label: string
  comingSoon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '홈' },
  { to: '/bus', label: '버스' },
  { to: '/chat', label: '대화', comingSoon: true },
  { to: '/pet', label: '펫' },
  { to: '/settings', label: '설정' }
]

export const Route = createRootRoute({
  component: RootLayout
})

function RootLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-800 select-none">
      <nav className="flex w-44 shrink-0 flex-col gap-1 border-neutral-200 border-r bg-white p-3">
        <p className="px-3 py-2 font-bold">desktop-pet</p>
        {NAV_ITEMS.map(({ to, label, comingSoon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-neutral-100"
            activeProps={{ className: 'bg-primary-100 font-semibold text-primary-800' }}
          >
            {label}
            {comingSoon && (
              <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 font-normal text-neutral-500 text-xs">
                준비 중
              </span>
            )}
          </Link>
        ))}
      </nav>
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
