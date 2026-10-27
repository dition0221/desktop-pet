import { join } from 'node:path'
import { isInsideRoot, resolveInsideRoot } from '@main/safePath'
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

  it('Windows가 다르게 해석하는 이름은 거부한다', () => {
    expect(resolveInsideRoot(ROOT, '/sprite.png:hidden')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/sprite.png%3a%3a$DATA')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/secrets.json.')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/secrets.json%20')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/assets./a.png')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/CON')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/assets/nul.png')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/com1.txt')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/com%C2%B9.png')).toBeNull()
    expect(resolveInsideRoot(ROOT, '/CONIN$')).toBeNull()
  })

  it('장치 이름과 비슷한 일반 이름은 허용한다', () => {
    expect(resolveInsideRoot(ROOT, '/console.png')).toBe(join(ROOT, 'console.png'))
    expect(resolveInsideRoot(ROOT, '/nullable.js')).toBe(join(ROOT, 'nullable.js'))
  })
})

describe('isInsideRoot', () => {
  it('실제 경로가 root 밖이면 거부한다', () => {
    expect(isInsideRoot(ROOT, 'C:\\app\\renderer\\a.png')).toBe(true)
    expect(isInsideRoot(ROOT, 'C:\\app\\secrets.json')).toBe(false)
    expect(isInsideRoot(ROOT, 'D:\\renderer\\a.png')).toBe(false)
    expect(isInsideRoot(ROOT, ROOT)).toBe(false)
  })
})
