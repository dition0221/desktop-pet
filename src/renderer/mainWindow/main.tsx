import { routeTree } from '@renderer/mainWindow/routeTree.gen'
import { mount } from '@renderer/shared/mount'
import { createHashHistory, createRouter, RouterProvider } from '@tanstack/react-router'

/** app://는 경로마다 파일을 찾음 — 경로 방식이면 새로고침 시 404라 hash 방식 */
const router = createRouter({ routeTree, history: createHashHistory() })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

mount(<RouterProvider router={router} />)
