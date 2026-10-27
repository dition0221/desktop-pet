import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout
})

function RootLayout(): React.JSX.Element {
  // TODO(R4) — 사이드바 레이아웃
  return <Outlet />
}
