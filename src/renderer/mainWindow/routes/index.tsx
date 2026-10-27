import Page from '@renderer/mainWindow/components/Page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomeScreen
})

function HomeScreen(): React.JSX.Element {
  return <Page title="홈" />
}
