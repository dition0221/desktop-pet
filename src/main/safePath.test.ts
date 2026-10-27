import { join } from 'node:path'
import { resolveInsideRoot } from '@main/safePath'
import { describe, expect, it } from 'vitest'

const ROOT = 'C:\\app\\renderer'

describe('resolveInsideRoot', () => {
  it('root 안의 파일 경로를 반환한다', () => {
    expect(resolveInsideRoot(ROOT, '/index.html')).toBe(join(ROOT, 'index.html'))
    expect(resolveInsideRoot(ROOT, '/assets/index-abc.js')).toBe(join(ROOT, 'assets/index-abc.js'))
    expect(resolveInsideRoot(ROOT, '/assets/..foo.js')).toBe(join(ROOT, 'assets/..foo.js'))
  })

  it('퍼센트 인코딩을 디코딩해 해석한다', () => {
    expect(resolveInsideRoot(ROOT, '/my%20pack/a.png')).toBe(join(ROOT, 'my pack/a.png'))
  })

  it('root 밖으로 나가는 경로는 거부한다', () => {
    expect(resolveInsideRoot(ROOT, '/../secrets.json')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/assets/../../secrets.json')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/%2e%2e/secrets.json')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/..%5csecrets.json')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/..%2f..%2fWindows')).toBeNull()
  })

  it('root 자체는 거부한다', () => {
    expect(resolveInsideRoot(ROOT, '/')).toBeNull()
    expect(resolveInsideRoot(ROOT, '')).toBeNull()
  })

  it('잘못된 인코딩과 NUL 문자는 거부한다', () => {
    expect(resolveInsideRoot(ROOT, '/%E0%A4%A')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/index.html%00.png')).toBeNull()
  })
})
