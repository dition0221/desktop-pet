import { isAbsolute, join, relative, sep } from 'node:path'

/** URL 경로를 root 안의 파일 경로로 — 디코딩 후 root 밖(`..`, 다른 드라이브)이면 null */
export function resolveInsideRoot(root: string, urlPathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(urlPathname)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null

  const target = join(root, decoded)
  const rel = relative(root, target)
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null
  return target
}
