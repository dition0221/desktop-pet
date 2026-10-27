import { resolve as resolvePath } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'

const resolve = { tsconfigPaths: true }

/** 모든 렌더러 페이지 공통 — `pack:`은 펫 팩 에셋 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: pack:",
  'media-src pack:',
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ')

function contentSecurityPolicy(): Plugin {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`
  return {
    name: 'content-security-policy',
    transformIndexHtml: {
      // 원본 HTML에 쓴 것과 같은 자리 — dev React preamble은 head 맨 앞에 붙어 CSP보다 먼저 실행돼야 한다
      order: 'pre',
      handler: (html) => {
        const charset = html.match(/<meta charset[^>]*>/)?.[0]
        if (!charset) throw new Error('CSP: <meta charset>가 없는 HTML')
        return html.replace(charset, `${charset}\n    ${meta}`)
      }
    }
  }
}

export default defineConfig({
  main: { resolve },
  preload: { resolve },
  renderer: {
    resolve,
    plugins: [
      tanstackRouter({
        target: 'react',
        routesDirectory: resolvePath('src/renderer/mainWindow/routes'),
        generatedRouteTree: resolvePath('src/renderer/mainWindow/routeTree.gen.ts')
      }),
      react(),
      tailwindcss(),
      contentSecurityPolicy()
    ],
    build: {
      rolldownOptions: {
        input: {
          index: resolvePath('src/renderer/index.html'),
          overlay: resolvePath('src/renderer/overlay.html')
        }
      }
    }
  }
})
