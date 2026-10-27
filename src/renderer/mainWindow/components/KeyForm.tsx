import type { SecretId, SecretStatus } from '@preload/api'
import { type FormEvent, useEffect, useId, useState } from 'react'

/** 메인의 저장 스키마와 같은 상한 — 넘기면 IPC에서 거부된다 */
const MAX_KEY_LENGTH = 1024
const ENCRYPTION_UNAVAILABLE_MESSAGE = '이 PC에서는 암호화를 쓸 수 없어 키를 저장하지 않았어요'
const KEY_FILE_ERROR_MESSAGE = '키 파일을 읽거나 쓰지 못했어요'

interface KeyFormProps {
  secretId: SecretId
  label: string
}

function savedLabel(status: SecretStatus): string {
  return status.last4 === null
    ? '저장됐지만 이 PC에서 읽을 수 없어요 — 다시 입력하세요'
    : `저장됨 (끝자리 ${status.last4})`
}

function KeyForm({ secretId, label }: KeyFormProps): React.JSX.Element {
  const inputId = useId()
  const [status, setStatus] = useState<SecretStatus | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.secrets.getStatus(secretId).then(setStatus, () => setError(KEY_FILE_ERROR_MESSAGE))
  }, [secretId])

  const save = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    try {
      const result = await window.api.secrets.save(secretId, value)
      if (!result.ok) {
        setError(ENCRYPTION_UNAVAILABLE_MESSAGE)
        return
      }
      setStatus(result.status)
      setValue('')
      setError(null)
    } catch {
      setError(KEY_FILE_ERROR_MESSAGE)
    }
  }

  const remove = async (): Promise<void> => {
    try {
      setStatus(await window.api.secrets.remove(secretId))
      setError(null)
    } catch {
      setError(KEY_FILE_ERROR_MESSAGE)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <label htmlFor={inputId} className="font-medium text-sm">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="password"
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_KEY_LENGTH}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={status?.saved ? '새 키로 바꾸려면 입력' : '키 입력'}
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
        >
          저장
        </button>
      </div>
      <div className="flex h-7 items-center gap-2 text-neutral-500 text-sm">
        {status?.saved ? (
          <>
            <span>{savedLabel(status)}</span>
            <button
              type="button"
              onClick={() => void remove()}
              className="rounded-md px-2 py-0.5 text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
          </>
        ) : (
          status && <span>저장된 키 없음</span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}
    </form>
  )
}

export default KeyForm
