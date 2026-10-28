import { readdir, realpath, stat } from 'node:fs/promises'
import { join } from 'node:path'
import {
  framesFitSheet,
  PACK_ID_PATTERN,
  type PackManifest,
  packManifestSchema
} from '@main/pack/schema'
import { isInsideRoot, resolveInsideRoot } from '@main/safePath'
import { readJsonFile } from '@main/store/jsonFile'
import type { PackSummary, PetSprite } from '@preload/api'
import { app, nativeImage } from 'electron'

/** 고른 팩을 못 읽을 때 쓰는 동봉 팩 */
export const DEFAULT_PACK_ID = '_example'

const MANIFEST_FILE = 'pack.json'

/** 동봉 팩(개발 = 저장소, 설치본 = resources)이 사용자 팩보다 우선 — 같은 id로 덮어쓰지 못하게 */
function packRoots(): string[] {
  const bundledRoot = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return [join(bundledRoot, 'packs'), join(app.getPath('userData'), 'packs')]
}

export async function findPackDir(id: string): Promise<string | null> {
  if (!PACK_ID_PATTERN.test(id)) return null
  for (const root of packRoots()) {
    const dir = join(root, id)
    const manifest = await stat(join(dir, MANIFEST_FILE)).catch(() => null)
    if (manifest?.isFile()) return dir
  }
  return null
}

/** 팩 폴더 안의 실제 파일 — 정션·심볼릭 링크가 팩 밖을 가리키면 null */
export async function resolvePackFile(dir: string, urlPathname: string): Promise<string | null> {
  const file = resolveInsideRoot(dir, urlPathname)
  if (!file) return null
  try {
    const [realRoot, realFile] = await Promise.all([realpath(dir), realpath(file)])
    if (!isInsideRoot(realRoot, realFile)) return null
    return (await stat(realFile)).isFile() ? realFile : null
  } catch {
    return null
  }
}

/** 시트까지 확인 — 이미지가 안 뜨면 보이지 않는 펫이 클릭을 가로챈다 */
export async function loadPack(id: string): Promise<PackManifest | null> {
  const dir = await findPackDir(id)
  if (!dir) {
    console.error(`[pack] ${id}: not found`)
    return null
  }
  try {
    const manifest = packManifestSchema.parse(await readJsonFile(join(dir, MANIFEST_FILE)))
    if (manifest.id !== id) throw new Error(`id mismatch: ${manifest.id}`)

    const image = await resolvePackFile(dir, manifest.sprite.image)
    const sheet = image ? nativeImage.createFromPath(image) : null
    if (!sheet || sheet.isEmpty()) throw new Error(`unreadable sprite: ${manifest.sprite.image}`)
    if (!framesFitSheet(manifest, sheet.getSize())) throw new Error('frames outside sprite sheet')
    return manifest
  } catch (error) {
    console.error(`[pack] ${id}: invalid pack`, error)
    return null
  }
}

/** 읽을 수 있는 팩만 — 같은 id는 앞쪽 루트 것 하나 */
export async function listPacks(): Promise<PackSummary[]> {
  const packs = new Map<string, PackSummary>()
  for (const root of packRoots()) {
    const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (!entry.isDirectory() || packs.has(entry.name)) continue
      const manifest = await loadPack(entry.name)
      if (manifest) packs.set(manifest.id, { id: manifest.id, name: manifest.name })
    }
  }
  return [...packs.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export function toPetSprite(manifest: PackManifest): PetSprite {
  const { image, ...frame } = manifest.sprite
  return {
    url: `pack://${manifest.id}/${image}`,
    ...frame,
    animations: manifest.animations
  }
}
