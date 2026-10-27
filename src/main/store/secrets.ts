import { handle } from '@main/ipc'
import { readJsonFile, userDataFile, writeJsonFile } from '@main/store/jsonFile'
import type { SaveSecretResult, SecretId, SecretStatus } from '@preload/api'
import { IPC } from '@preload/channels'
import { safeStorage } from 'electron'
import { z } from 'zod'

const SECRET_IDS = ['busServiceKey', 'geminiApiKey'] as const satisfies readonly SecretId[]
const SECRETS_FILE = 'secrets.json'
const NOT_SAVED: SecretStatus = { saved: false, last4: null }

/** 값은 safeStorage 암호문의 base64 */
const secretsFileSchema = z.record(z.string(), z.string())
const secretValueSchema = z.string().trim().min(1).max(1024)

type EncryptedSecrets = Record<string, string>

let writing: Promise<unknown> = Promise.resolve()

/** 파일이 없을 때만 빈 값 — 깨진 파일을 빈 값으로 읽고 덮어쓰면 다른 키가 사라진다 */
async function readEncrypted(): Promise<EncryptedSecrets> {
  return secretsFileSchema.parse((await readJsonFile(userDataFile(SECRETS_FILE))) ?? {})
}

/** 읽고-고치고-쓰기가 겹치면 먼저 저장한 키가 사라짐 — 한 줄로 세운다 */
function mutate(change: (secrets: EncryptedSecrets) => void): Promise<void> {
  const task = writing.then(async () => {
    const secrets = await readEncrypted()
    change(secrets)
    await writeJsonFile(userDataFile(SECRETS_FILE), secrets)
  })
  writing = task.catch(() => undefined)
  return task
}

function decrypt(encrypted: string): string | null {
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return null
  }
}

export async function getSecretStatus(id: SecretId): Promise<SecretStatus> {
  const encrypted = (await readEncrypted())[id]
  if (!encrypted) return NOT_SAVED
  return { saved: true, last4: decrypt(encrypted)?.slice(-4) ?? null }
}

export async function saveSecret(id: SecretId, value: string): Promise<SaveSecretResult> {
  // 암호화를 못 쓰면 평문으로 남기지 않고 저장 자체를 거부
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, reason: 'encryption-unavailable' }
  const encrypted = safeStorage.encryptString(value).toString('base64')
  await mutate((secrets) => {
    secrets[id] = encrypted
  })
  return { ok: true, status: { saved: true, last4: value.slice(-4) } }
}

export async function deleteSecret(id: SecretId): Promise<SecretStatus> {
  await mutate((secrets) => {
    delete secrets[id]
  })
  return NOT_SAVED
}

/** 원문을 돌려주는 채널은 두지 않는다 — 키는 메인 프로세스 안에서만 복호화 */
export function registerSecretsIpc(): void {
  const secretId = z.enum(SECRET_IDS)
  handle(IPC.secretsGetStatus, { allow: ['main'], payload: secretId }, getSecretStatus)
  handle(
    IPC.secretsSave,
    { allow: ['main'], payload: z.object({ id: secretId, value: secretValueSchema }) },
    ({ id, value }) => saveSecret(id, value)
  )
  handle(IPC.secretsDelete, { allow: ['main'], payload: secretId }, deleteSecret)
}
