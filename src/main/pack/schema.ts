import { z } from 'zod'

/** 팩 폴더 이름이자 `pack://` 호스트 — 호스트는 소문자로 바뀌고, 숫자로 시작하면 IPv4로 해석된다 */
export const PACK_ID_PATTERN = /^[a-z_][a-z0-9_-]{0,63}$/

/** 팩 루트 기준 상대 경로 — `..`·역슬래시·드라이브가 들어갈 수 없는 형태로 제한 */
const SPRITE_FILE_PATTERN = /^[\w-]+(\/[\w-]+)*\.png$/

const animationSchema = z.object({
  row: z.int().nonnegative(),
  frames: z.int().positive(),
  fps: z.number().positive().max(60)
})

export const packManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(PACK_ID_PATTERN),
  name: z.string().min(1).max(64),
  sprite: z.object({
    image: z.string().regex(SPRITE_FILE_PATTERN),
    frameWidth: z.int().min(1).max(256),
    frameHeight: z.int().min(1).max(256),
    scale: z.int().min(1).max(4).default(1)
  }),
  animations: z.object({ idle: animationSchema, walk: animationSchema }),
  // 형식은 쓰는 Phase에서 정한다 — 지금은 이름만 예약
  persona: z.string().optional(),
  voices: z.record(z.string(), z.string()).optional(),
  tts: z.record(z.string(), z.unknown()).optional()
})

export type PackManifest = z.output<typeof packManifestSchema>

export function framesFitSheet(
  manifest: PackManifest,
  sheet: { width: number; height: number }
): boolean {
  const { frameWidth, frameHeight } = manifest.sprite
  return Object.values(manifest.animations).every(
    ({ row, frames }) =>
      frames * frameWidth <= sheet.width && (row + 1) * frameHeight <= sheet.height
  )
}
