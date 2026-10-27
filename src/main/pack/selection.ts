import { handle } from '@main/ipc'
import { DEFAULT_PACK_ID, listPacks, loadPack } from '@main/pack/library'
import { PACK_ID_PATTERN, type PackManifest } from '@main/pack/schema'
import { setPetPack } from '@main/pet/controller'
import { getSettings, updateSettings } from '@main/store/settings'
import { IPC } from '@preload/channels'
import { z } from 'zod'

/** 설정과 달리 실제로 화면에 올라간 팩 — 둘 다 못 읽었으면 null */
let activePackId: string | null = null
let selecting: Promise<unknown> = Promise.resolve()

/** 고른 팩을 못 읽으면 동봉 팩으로 — 설정도 실제로 보이는 팩으로 맞춘다 */
export async function loadSelectedPack(): Promise<PackManifest | null> {
  const { packId } = getSettings()
  const pack =
    (await loadPack(packId)) ??
    (packId === DEFAULT_PACK_ID ? null : await loadPack(DEFAULT_PACK_ID))
  if (pack && pack.id !== packId) updateSettings({ packId: pack.id })
  activePackId = pack?.id ?? null
  return pack
}

async function applySelection(id: string): Promise<boolean> {
  if (id === activePackId) return true
  const pack = await loadPack(id)
  if (!pack) return false
  activePackId = id
  updateSettings({ packId: id })
  setPetPack(pack)
  return true
}

/** 연달아 고르면 로드가 늦게 끝난 쪽이 이겨 설정과 화면이 어긋남 — 순서대로 처리 */
function selectPack(id: string): Promise<boolean> {
  const task = selecting.then(() => applySelection(id))
  selecting = task.catch(() => undefined)
  return task
}

export function registerPackIpc(): void {
  handle(IPC.packList, { allow: ['main'], payload: z.undefined() }, listPacks)
  handle(
    IPC.packSelect,
    { allow: ['main'], payload: z.string().regex(PACK_ID_PATTERN) },
    selectPack
  )
}
