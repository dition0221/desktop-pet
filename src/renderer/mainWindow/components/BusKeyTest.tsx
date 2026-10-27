import type { BusApiName, BusErrorCode } from '@preload/api'
import { BUS_ERROR_MESSAGES } from '@renderer/mainWindow/busErrorMessages'
import Button from '@renderer/mainWindow/components/Button'
import { useState } from 'react'

const API_LABELS: Record<BusApiName, string> = {
  stop: '정류소 (국토교통부)',
  route: '노선 (국토교통부)',
  arrival: '도착 (대전시)'
}

function BusKeyTest(): React.JSX.Element {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<Record<BusApiName, BusErrorCode | 'ok'> | null>(null)

  const test = async (): Promise<void> => {
    setTesting(true)
    try {
      setResults(await window.api.bus.testKey())
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button busy={testing} onClick={() => void test()} className="self-start">
        버스 API 연결 확인
      </Button>
      {results && (
        <ul className="flex flex-col gap-1 text-sm">
          {(Object.keys(API_LABELS) as BusApiName[]).map((api) => (
            <li key={api} className="flex gap-2">
              <span className="w-28 shrink-0 text-neutral-500">{API_LABELS[api]}</span>
              {results[api] === 'ok' ? (
                <span className="text-green-700">연결됨</span>
              ) : (
                <span className="text-red-600">
                  {BUS_ERROR_MESSAGES[results[api] as BusErrorCode]}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-neutral-400 text-xs">
        공공데이터포털에서 국토교통부(TAGO) 버스정류소정보·버스노선정보와 대전광역시 정류소별
        도착정보 조회를 각각 활용신청해야 해요. 발급 직후에는 키가 등록되지 않았다는 오류가 날 수
        있어요.
      </p>
    </div>
  )
}

export default BusKeyTest
