import type { BusPollSettings } from '@preload/api'
import Select from '@renderer/mainWindow/components/Select'
import TextInput from '@renderer/mainWindow/components/TextInput'
import { useEffect, useId, useState } from 'react'

const INTERVAL_OPTIONS: { value: BusPollSettings['intervalSec']; label: string }[] = [
  { value: 30, label: '30초' },
  { value: 60, label: '1분' },
  { value: 120, label: '2분' },
  { value: 300, label: '5분' }
]
const ALERT_MINUTE_OPTIONS: BusPollSettings['alertMinutes'][] = [3, 5, 10, 15]

type ActiveHours = BusPollSettings['activeHours']

interface BusPollFormProps {
  settings: BusPollSettings
}

function BusPollForm({ settings }: BusPollFormProps): React.JSX.Element {
  const intervalId = useId()
  const alertId = useId()
  // 시각 입력은 칸 하나만 바꿔도 change가 와서, 중간값이 저장돼 조회를 깨우지 않게 포커스가 빠질 때 저장한다
  const [hours, setHours] = useState<ActiveHours>(settings.activeHours)

  useEffect(() => {
    setHours(settings.activeHours)
  }, [settings.activeHours])

  const save = (patch: Partial<BusPollSettings>): void => {
    void window.api.bus.setPollSettings({ ...settings, ...patch })
  }

  const saveHours = (): void => {
    const changed =
      hours.start !== settings.activeHours.start || hours.end !== settings.activeHours.end
    if (changed && hours.start && hours.end) save({ activeHours: hours })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-medium text-sm">도착 정보 갱신 · 알림</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <label htmlFor={intervalId} className="flex items-center gap-2">
          <span className="text-neutral-500">간격</span>
          <Select
            id={intervalId}
            value={settings.intervalSec}
            onChange={(event) =>
              save({ intervalSec: Number(event.target.value) as BusPollSettings['intervalSec'] })
            }
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">운행 시간</span>
          <TextInput
            type="time"
            aria-label="갱신 시작 시각"
            value={hours.start}
            onChange={(event) => setHours({ ...hours, start: event.target.value })}
            onBlur={saveHours}
          />
          <span className="text-neutral-400">~</span>
          <TextInput
            type="time"
            aria-label="갱신 끝 시각"
            value={hours.end}
            onChange={(event) => setHours({ ...hours, end: event.target.value })}
            onBlur={saveHours}
          />
        </div>
        <label htmlFor={alertId} className="flex items-center gap-2">
          <span className="text-neutral-500">알림</span>
          <Select
            id={alertId}
            value={settings.alertMinutes}
            onChange={(event) =>
              save({ alertMinutes: Number(event.target.value) as BusPollSettings['alertMinutes'] })
            }
          >
            {ALERT_MINUTE_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes}분 전
              </option>
            ))}
          </Select>
        </label>
      </div>
      <p className="text-neutral-400 text-xs">
        메인 창이 열려 있을 때는 모든 즐겨찾기를, 닫혀 있을 때는 홈에서 🔔을 켠 노선만 운행 시간에
        갱신해요. 시작과 끝을 같게 두면 하루 종일이에요. 즐겨찾기가 많으면 하루 호출 한도에 맞춰
        간격이 자동으로 늘어나요.
      </p>
    </div>
  )
}

export default BusPollForm
