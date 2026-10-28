import type { BusApiName, BusErrorCode } from '@preload/api'
import { BUS_ERROR_MESSAGES } from '@renderer/mainWindow/busErrorMessages'
import Button from '@renderer/mainWindow/components/Button'
import { Fragment, useState } from 'react'

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
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {(Object.keys(API_LABELS) as BusApiName[]).map((api) => (
            <Fragment key={api}>
              <dt className="whitespace-nowrap text-neutral-500">{API_LABELS[api]}</dt>
              {results[api] === 'ok' ? (
                <dd className="text-green-700">연결됨</dd>
              ) : (
                <dd className="text-red-600">{BUS_ERROR_MESSAGES[results[api] as BusErrorCode]}</dd>
              )}
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  )
}

export default BusKeyTest
