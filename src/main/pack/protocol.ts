import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { findPackDir, resolvePackFile } from '@main/pack/library'
import { type CustomScheme, protocol } from 'electron'

const PACK_SCHEME = 'pack'

/** standard여야 호스트(팩 id)와 경로가 나뉘고, secure여야 http 개발 서버 페이지에서도 불러온다 */
export const PACK_SCHEME_PRIVILEGES: CustomScheme = {
  scheme: PACK_SCHEME,
  privileges: { standard: true, secure: true }
}

/** TODO(Phase 3) — 음성 클립 오디오 형식 */
const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png'
}

function mimeTypeOf(path: string): string | undefined {
  return MIME_TYPES[extname(path).toLowerCase()]
}

export function handlePackProtocol(): void {
  protocol.handle(PACK_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      // 허용 형식이 아니면 파일시스템에 닿기 전에 거른다 — 실제 파일 확장자는 아래에서 다시 확인
      const dir = mimeTypeOf(url.pathname) ? await findPackDir(url.host) : null
      const file = dir && (await resolvePackFile(dir, url.pathname))
      const contentType = file && mimeTypeOf(file)
      if (!file || !contentType) return new Response(null, { status: 404 })

      const body = await readFile(file)
      return new Response(new Uint8Array(body), { headers: { 'content-type': contentType } })
    } catch {
      return new Response(null, { status: 404 })
    }
  })
}
