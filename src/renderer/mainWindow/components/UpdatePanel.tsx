import type { UpdateStatus } from '@preload/api'
import Button from '@renderer/mainWindow/components/Button'
import { useMainValue } from '@renderer/shared/hooks/useMainValue'

function statusText(status: UpdateStatus): string | null {
  switch (status.state) {
    case 'dev':
      return '개발 모드에서는 업데이트를 확인하지 않아요'
    case 'idle':
      return null
    case 'checking':
      return '새 버전을 확인하는 중이에요'
    case 'up-to-date': {
      const time = new Date(status.checkedAt).toLocaleTimeString('ko-KR', { timeStyle: 'short' })
      return `최신 버전이에요 (${time} 확인)`
    }
    case 'downloading':
      return `새 버전 v${status.version} 받는 중 ${status.percent}%`
    case 'ready':
      return `새 버전 v${status.version} 준비됨 — 다시 시작하면 적용돼요`
    case 'error':
      return '업데이트하지 못했어요 — 잠시 뒤 다시 시도해 주세요'
  }
}

function UpdatePanel(): React.JSX.Element | null {
  const snapshot = useMainValue(window.api.updates.getStatus, window.api.updates.onStatusChange)
  if (!snapshot) return null

  const { state } = snapshot.status
  const text = statusText(snapshot.status)

  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-sm">앱 업데이트</p>
      <p className="text-neutral-500 text-sm">현재 버전 v{snapshot.currentVersion}</p>
      {state === 'ready' ? (
        <Button
          variant="primary"
          onClick={() => void window.api.updates.install()}
          className="self-start"
        >
          다시 시작해서 업데이트
        </Button>
      ) : (
        <Button
          busy={state === 'checking' || state === 'downloading'}
          disabled={state === 'dev'}
          onClick={() => void window.api.updates.check()}
          className="self-start"
        >
          업데이트 확인
        </Button>
      )}
      {text && <p className="text-neutral-500 text-sm">{text}</p>}
    </div>
  )
}

export default UpdatePanel
