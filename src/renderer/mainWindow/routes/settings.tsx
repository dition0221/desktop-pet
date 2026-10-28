import BusKeyGuide from '@renderer/mainWindow/components/BusKeyGuide'
import BusKeyTest from '@renderer/mainWindow/components/BusKeyTest'
import BusPollForm from '@renderer/mainWindow/components/BusPollForm'
import KeyForm from '@renderer/mainWindow/components/KeyForm'
import Page from '@renderer/mainWindow/components/Page'
import UpdatePanel from '@renderer/mainWindow/components/UpdatePanel'
import { useSettings } from '@renderer/mainWindow/hooks/useSettings'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  component: SettingsScreen
})

/** TODO(Phase 4) — 대화를 열 때 Gemini 키 입력란(geminiApiKey)·테스트 버튼·발급 안내 */
function SettingsScreen(): React.JSX.Element {
  const settings = useSettings()

  return (
    <Page title="설정">
      <div className="flex flex-col gap-3">
        <KeyForm
          secretId="busServiceKey"
          label="공공데이터포털 서비스 키 (버스)"
          guide={<BusKeyGuide />}
        />
        <BusKeyTest />
      </div>
      {settings && <BusPollForm settings={settings.busPoll} />}
      <UpdatePanel />
    </Page>
  )
}
