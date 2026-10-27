import Page from '@renderer/mainWindow/components/Page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/bus')({
  component: BusScreen
})

/** TODO(Phase 2) — 정류소 즐겨찾기·도착 정보 */
function BusScreen(): React.JSX.Element {
  return <Page title="버스" />
}
