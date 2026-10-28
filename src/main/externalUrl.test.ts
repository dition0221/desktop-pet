import { toAllowedExternalUrl } from '@main/externalUrl'
import { describe, expect, it } from 'vitest'

describe('toAllowedExternalUrl', () => {
  it('허용 목록에 있는 https URL은 정규화해 반환한다', () => {
    expect(toAllowedExternalUrl('https://github.com/example/repo')).toBe(
      'https://github.com/example/repo'
    )
    expect(toAllowedExternalUrl('https://www.data.go.kr')).toBe('https://www.data.go.kr/')
  })

  it('파싱 전 원본이 아니라 정규화된 값을 반환한다', () => {
    expect(toAllowedExternalUrl('  https://github.com\\example  ')).toBe(
      'https://github.com/example'
    )
  })

  it('https가 아니면 거부한다', () => {
    expect(toAllowedExternalUrl('http://github.com')).toBeNull()
    expect(toAllowedExternalUrl('file:///C:/Windows/System32/calc.exe')).toBeNull()
    expect(toAllowedExternalUrl('javascript:alert(1)')).toBeNull()
  })

  it('허용 목록에 없는 호스트는 거부한다', () => {
    expect(toAllowedExternalUrl('https://example.com')).toBeNull()
    expect(toAllowedExternalUrl('https://github.com.evil.example')).toBeNull()
    expect(toAllowedExternalUrl('https://evil.example/?https://github.com')).toBeNull()
  })

  it('계정 정보가 포함된 URL은 거부한다', () => {
    expect(toAllowedExternalUrl('https://user:pass@github.com')).toBeNull()
  })

  it('URL 형식이 아니면 거부한다', () => {
    expect(toAllowedExternalUrl('not a url')).toBeNull()
    expect(toAllowedExternalUrl('')).toBeNull()
  })
})
