import Page from '@renderer/mainWindow/components/Page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/chat')({
  component: ChatScreen
})

/** TODO(Phase 4) — 펫과 대화 */
function ChatScreen(): React.JSX.Element {
  return (
    <Page title="대화">
      <p className="text-neutral-500 text-sm">펫과 대화하는 기능은 준비하고 있어요</p>
    </Page>
  )
}
