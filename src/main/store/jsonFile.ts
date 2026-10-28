import { open, readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { app } from 'electron'

const UTF8_BOM = 0xfeff
const RENAME_RETRIES = 3
const RENAME_RETRY_MS = 50

/** 개발 모드는 index.ts가 시작할 때 userData를 바꾸므로 경로는 호출 시점에 만든다 */
export function userDataFile(name: string): string {
  return join(app.getPath('userData'), name)
}

/** 파일이 없을 때만 undefined — 읽기·파싱 실패는 던져서 깨진 파일을 덮어쓰기 전에 멈춘다 */
export async function readJsonFile(path: string): Promise<unknown> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
  // 메모장·PowerShell 5.1은 UTF-8 BOM을 붙여 저장한다
  return JSON.parse(text.charCodeAt(0) === UTF8_BOM ? text.slice(1) : text)
}

/** 백신·인덱서가 대상 파일을 잠깐 쥐고 있으면 Windows rename이 EPERM·EBUSY로 실패한다 */
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await rename(from, to)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (attempt >= RENAME_RETRIES || (code !== 'EPERM' && code !== 'EBUSY')) throw error
      await sleep(RENAME_RETRY_MS)
    }
  }
}

/** 임시 파일을 디스크까지 내린 뒤 교체 — 도중에 꺼지거나 전원이 나가도 기존 파일이 남는다 */
export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  const temp = `${path}.tmp`
  const file = await open(temp, 'w')
  try {
    await file.writeFile(`${JSON.stringify(data, null, 2)}\n`, 'utf8')
    await file.sync()
  } finally {
    await file.close()
  }
  await renameWithRetry(temp, path)
}
