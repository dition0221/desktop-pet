import { busFavoriteSchema } from '@main/bus/tago'
import { broadcast, handle } from '@main/ipc'
import { DEFAULT_PACK_ID } from '@main/pack/library'
import { PACK_ID_PATTERN } from '@main/pack/schema'
import { readJsonFile, userDataFile, writeJsonFile } from '@main/store/jsonFile'
import type { Settings } from '@preload/api'
import { IPC } from '@preload/channels'
import { z } from 'zod'

const SETTINGS_FILE = 'settings.json'
export const MAX_BUS_FAVORITES = 20

/** 목록은 깨진 항목만 버린다 — 하나 때문에 목록 전체를 잃지 않게 */
function validItems<T>(items: unknown[], schema: z.ZodType<T>): T[] {
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
}

/** 잘못된 항목만 기본값으로 — 하나가 깨져도 나머지 설정은 살린다 */
const settingsSchema = z.object({
  petVisible: z.boolean().catch(true),
  packId: z.string().regex(PACK_ID_PATTERN).catch(DEFAULT_PACK_ID),
  busFavorites: z
    .array(z.unknown())
    .catch([])
    .transform((items) => validItems(items, busFavoriteSchema).slice(0, MAX_BUS_FAVORITES))
}) satisfies z.ZodType<Settings>

let settings: Settings
let writing: Promise<unknown> = Promise.resolve()

/** 창을 만들기 전에 한 번 — 키가 없는 파일이라 깨졌으면 기본값으로 시작해 다음 저장 때 덮어쓴다 */
export async function loadSettings(): Promise<void> {
  const raw = await readJsonFile(userDataFile(SETTINGS_FILE)).catch((error) => {
    console.error('[settings] read failed', error)
    return undefined
  })
  const parsed = settingsSchema.safeParse(raw)
  settings = parsed.success ? parsed.data : settingsSchema.parse({})
}

export function getSettings(): Settings {
  return settings
}

export function updateSettings(patch: Partial<Settings>): void {
  settings = { ...settings, ...patch }
  const snapshot = settings
  // 연달아 바뀌어도 마지막 값이 마지막에 쓰이도록 순서대로 쓴다
  writing = writing
    .then(() => writeJsonFile(userDataFile(SETTINGS_FILE), snapshot))
    .catch((error) => console.error('[settings] write failed', error))
  broadcast(IPC.settingsChanged, settings, ['main'])
}

export function registerSettingsIpc(): void {
  handle(IPC.settingsGet, { allow: ['main'], payload: z.undefined() }, getSettings)
}
