import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { resolveInsideRoot } from '@main/safePath'
import { type CustomScheme, protocol } from 'electron'

const APP_SCHEME = 'app'
const APP_HOST = 'renderer'
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`

const RENDERER_ROOT = join(__dirname, '../renderer')

/** 모듈 스크립트는 MIME이 맞지 않으면 실행되지 않음 */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

/** standard·secure여야 origin이 생겨 CSP 'self'가 동작 */
export const APP_SCHEME_PRIVILEGES: CustomScheme = {
  scheme: APP_SCHEME,
  privileges: { standard: true, secure: true }
}

/** GrantFileProtocolExtraPrivileges fuse를 끄면 file://로 asar 안 페이지를 못 읽음 — 렌더러를 여기서 서빙 */
export function handleAppProtocol(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url)
    const file = url.host === APP_HOST ? resolveInsideRoot(RENDERER_ROOT, url.pathname) : null
    if (!file) return new Response(null, { status: 404 })

    try {
      const body = await readFile(file)
      const contentType = MIME_TYPES[extname(file)] ?? 'application/octet-stream'
      return new Response(new Uint8Array(body), { headers: { 'content-type': contentType } })
    } catch {
      return new Response(null, { status: 404 })
    }
  })
}
