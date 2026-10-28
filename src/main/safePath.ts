import { isAbsolute, join, relative, sep } from 'node:path'

/** 확장자가 붙어도 Windows가 장치로 여는 이름 */
const WINDOWS_DEVICE_NAME = /^(con|prn|aux|nul|conin\$|conout\$|(com|lpt)[0-9¹²³])(\..*)?$/i

/** `:`는 대체 데이터 스트림, 끝의 점·공백은 Windows가 지워 다른 파일을 가리킨다 */
function isUnsafeSegment(segment: string): boolean {
  return segment.includes(':') || /[. ]$/.test(segment) || WINDOWS_DEVICE_NAME.test(segment)
}

/** target이 root 아래의 파일 경로인지 — root 자체, 상위 폴더, 다른 드라이브, Windows 특수 이름은 거부 */
export function isInsideRoot(root: string, target: string): boolean {
  const rel = relative(root, target)
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return false
  return !rel.split(sep).some(isUnsafeSegment)
}

/** URL 경로를 root 안의 파일 경로로 — 디코딩 후 root 밖이면 null */
export function resolveInsideRoot(root: string, urlPathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(urlPathname)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null

  const target = join(root, decoded)
  return isInsideRoot(root, target) ? target : null
}
