import type { BusPollSettings } from '@preload/api'
import TextInput from '@renderer/mainWindow/components/TextInput'
import { useEffect, useId, useState } from 'react'

const INTERVAL_OPTIONS: { value: BusPollSettings['intervalSec']; label: string }[] = [
  { value: 30, label: '30초' },
  { value: 60, label: '1분' },
  { value: 120, label: '2분' },
  { value: 300, label: '5분' }
]

type ActiveHours = BusPollSettings['activeHours']

interface BusPollFormProps {
  settings: BusPollSettings
}

function BusPollForm({ settings }: BusPollFormProps): React.JSX.Element {
  const intervalId = useId()
  // 시각 입력은 칸 하나만 바꿔도 change가 와서, 중간값이 저장돼 조회를 깨우지 않게 포커스가 빠질 때 저장한다
  const [hours, setHours] = useState<ActiveHours>(settings.activeHours)

  useEffect(() => {
    setHours(settings.activeHours)
  }, [settings.activeHours])

  const saveHours = (): void => {
    const changed =
      hours.start !== settings.activeHours.start || hours.end !== settings.activeHours.end
    if (changed && hours.start && hours.end) {
      void window.api.bus.setPollSettings({ ...settings, activeHours: hours })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-medium text-sm">도착 정보 갱신</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <label htmlFor={intervalId} className="flex items-center gap-2">
          <span className="text-neutral-500">간격</span>
          <select
            id={intervalId}
            value={settings.intervalSec}
            onChange={(event) =>
              void window.api.bus.setPollSettings({
                ...settings,
                intervalSec: Number(event.target.value) as BusPollSettings['intervalSec']
              })
            }
            className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
      </div>
      <p className="text-neutral-400 text-xs">
        메인 창이 열려 있고 운행 시간일 때만 갱신해요. 시작과 끝을 같게 두면 하루 종일이에요.
        즐겨찾기가 많으면 하루 호출 한도에 맞춰 간격이 자동으로 늘어나요.
      </p>
    </div>
  )
}

export default BusPollForm
