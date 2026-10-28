import { readFileSync } from 'node:fs'
import { framesFitSheet, packManifestSchema } from '@main/pack/schema'
import { describe, expect, it } from 'vitest'

const EXAMPLE = JSON.parse(readFileSync('packs/_example/pack.json', 'utf8'))

function withSprite(sprite: Record<string, unknown>): unknown {
  return { ...EXAMPLE, sprite: { ...EXAMPLE.sprite, ...sprite } }
}

describe('packManifestSchema', () => {
  it('동봉 예제 팩을 통과시킨다', () => {
    expect(packManifestSchema.safeParse(EXAMPLE).success).toBe(true)
  })

  it('scale은 생략하면 1이다', () => {
    const { scale: _, ...sprite } = EXAMPLE.sprite
    expect(packManifestSchema.parse({ ...EXAMPLE, sprite }).sprite.scale).toBe(1)
  })

  it('팩 루트 밖이나 허용하지 않는 형식의 이미지 경로는 거부한다', () => {
    for (const image of [
      '../sprite.png',
      'a/../../sprite.png',
      '/sprite.png',
      'C:/sprite.png',
      'img\\sprite.png',
      'sprite.svg',
      'sprite.webp',
      'sprite.png:stream.png',
      ''
    ]) {
      expect(packManifestSchema.safeParse(withSprite({ image })).success, image).toBe(false)
    }
  })

  it('하위 폴더 이미지는 허용한다', () => {
    expect(packManifestSchema.safeParse(withSprite({ image: 'img/walk_01.png' })).success).toBe(
      true
    )
  })

  it('URL 호스트로 못 쓰거나 IPv4로 해석되는 id는 거부한다', () => {
    for (const id of ['Example', 'my pack', 'a.b', '', 'x'.repeat(65), '123', '0x1f', '-a']) {
      expect(packManifestSchema.safeParse({ ...EXAMPLE, id }).success, id).toBe(false)
    }
  })

  it('애니메이션 프레임이 스프라이트 시트 밖이면 맞지 않다고 판정한다', () => {
    const manifest = packManifestSchema.parse(EXAMPLE)
    expect(framesFitSheet(manifest, { width: 128, height: 64 })).toBe(true)
    expect(framesFitSheet(manifest, { width: 96, height: 64 })).toBe(false)
    expect(framesFitSheet(manifest, { width: 128, height: 32 })).toBe(false)
  })

  it('지원하지 않는 스키마 버전과 0프레임 애니메이션은 거부한다', () => {
    expect(packManifestSchema.safeParse({ ...EXAMPLE, schemaVersion: 2 }).success).toBe(false)
    const animations = { ...EXAMPLE.animations, walk: { row: 1, frames: 0, fps: 8 } }
    expect(packManifestSchema.safeParse({ ...EXAMPLE, animations }).success).toBe(false)
  })
})
