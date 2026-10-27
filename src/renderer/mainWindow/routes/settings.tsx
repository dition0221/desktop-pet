import KeyForm from '@renderer/mainWindow/components/KeyForm'
import Page from '@renderer/mainWindow/components/Page'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  component: SettingsScreen
})

/** TODO(Phase 2·4) — 키 테스트 버튼과 발급 안내 */
function SettingsScreen(): React.JSX.Element {
  return (
    <Page title="설정">
      <KeyForm secretId="busServiceKey" label="공공데이터포털 서비스 키 (버스)" />
      <KeyForm secretId="geminiApiKey" label="Gemini API 키 (대화)" />
    </Page>
  )
}
