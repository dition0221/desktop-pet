import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deleteSecret, getSecretStatus, saveSecret } from '@main/store/secrets'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electron = vi.hoisted(() => ({ userData: '', encryptionAvailable: true }))

const reverse = (text: string): string => [...text].reverse().join('')

vi.mock('@main/ipc', () => ({ handle: vi.fn() }))
vi.mock('electron', () => ({
  app: { getPath: () => electron.userData },
  safeStorage: {
    isEncryptionAvailable: () => electron.encryptionAvailable,
    encryptString: (value: string) => Buffer.from(reverse(value)),
    decryptString: (buffer: Buffer) => reverse(buffer.toString())
  }
}))

const KEY = 'test-key-abcd1234'

function secretsFile(): string {
  return join(electron.userData, 'secrets.json')
}

function storedValue(id: string): string {
  return Buffer.from(JSON.parse(readFileSync(secretsFile(), 'utf8'))[id], 'base64').toString()
}

describe('secrets', () => {
  beforeEach(() => {
    electron.userData = mkdtempSync(join(tmpdir(), 'desktop-pet-secrets-'))
    electron.encryptionAvailable = true
  })

  afterEach(() => {
    rmSync(electron.userData, { recursive: true, force: true })
  })

  it('암호화를 쓸 수 없으면 저장을 거부하고 파일을 만들지 않는다', async () => {
    electron.encryptionAvailable = false
    expect(await saveSecret('geminiApiKey', KEY)).toEqual({
      ok: false,
      reason: 'encryption-unavailable'
    })
    expect(existsSync(secretsFile())).toBe(false)
  })

  it('파일에는 암호문만 남기고 상태는 끝 4자리만 알려 준다', async () => {
    expect(await saveSecret('geminiApiKey', KEY)).toEqual({
      ok: true,
      status: { saved: true, last4: '1234' }
    })
    expect(storedValue('geminiApiKey')).toBe(reverse(KEY))
    expect(await getSecretStatus('geminiApiKey')).toEqual({ saved: true, last4: '1234' })
  })

  it('삭제해도 다른 키는 남는다', async () => {
    await Promise.all([saveSecret('geminiApiKey', KEY), saveSecret('busServiceKey', 'bus-9999')])
    expect(await deleteSecret('geminiApiKey')).toEqual({ saved: false, last4: null })
    expect(await getSecretStatus('geminiApiKey')).toEqual({ saved: false, last4: null })
    expect(await getSecretStatus('busServiceKey')).toEqual({ saved: true, last4: '9999' })
  })

  it('파일이 깨져 있으면 덮어쓰지 않고 실패한다', async () => {
    writeFileSync(secretsFile(), '{ "busServiceKey": ')
    await expect(saveSecret('geminiApiKey', KEY)).rejects.toThrow()
    expect(readFileSync(secretsFile(), 'utf8')).toBe('{ "busServiceKey": ')
  })
})
