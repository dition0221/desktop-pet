const ALLOWED_EXTERNAL_HOSTS = new Set([
  'github.com',
  'aistudio.google.com', // Gemini API 키 발급
  'www.data.go.kr' // 공공데이터포털 (버스 API 키 발급)
])

/** 허용되면 정규화된 URL을, 아니면 null을 반환 — 검사한 값 그대로 열도록 */
export function toAllowedExternalUrl(rawUrl: string): string | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  const allowed =
    url.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    ALLOWED_EXTERNAL_HOSTS.has(url.hostname)
  return allowed ? url.href : null
}
