import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_BUS_POLL } from '@main/bus/pollPlan'
import { getSettings, loadSettings, MAX_BUS_FAVORITES } from '@main/store/settings'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electron = vi.hoisted(() => ({ userData: '' }))

vi.mock('@main/ipc', () => ({ handle: vi.fn(), broadcast: vi.fn() }))
vi.mock('electron', () => ({
  app: { getPath: () => electron.userData, isPackaged: false, getAppPath: () => '' },
  nativeImage: {}
}))

const STOP = { id: 'DJB8001413', name: '대전역', number: '12460', lat: 36.33, lng: 127.43 }

function writeSettings(settings: unknown): void {
  writeFileSync(join(electron.userData, 'settings.json'), JSON.stringify(settings))
}

describe('loadSettings', () => {
  beforeEach(() => {
    electron.userData = mkdtempSync(join(tmpdir(), 'desktop-pet-settings-'))
  })

  afterEach(() => {
    rmSync(electron.userData, { recursive: true, force: true })
  })

  it('즐겨찾기는 깨진 항목만 버리고 나머지는 살린다', async () => {
    writeSettings({
      busFavorites: [
        { stop: STOP, route: null },
        { stop: { ...STOP, lat: 0 }, route: null },
        'broken',
        { stop: STOP, route: { id: 'DJB30300076', number: '612' } }
      ]
    })
    await loadSettings()
    expect(getSettings().busFavorites.map((f) => f.route?.number ?? null)).toEqual([null, '612'])
  })

  it('한도를 넘는 즐겨찾기는 앞에서부터 한도만큼 남긴다', async () => {
    const favorite = { stop: STOP, route: null }
    writeSettings({ busFavorites: Array.from({ length: MAX_BUS_FAVORITES + 5 }, () => favorite) })
    await loadSettings()
    expect(getSettings().busFavorites).toHaveLength(MAX_BUS_FAVORITES)
  })

  it('항목 하나가 잘못돼도 다른 설정은 그대로 읽는다', async () => {
    writeSettings({
      petVisible: false,
      packId: 'NOT VALID',
      busFavorites: 'oops',
      busPoll: { intervalSec: 5, activeHours: { start: '07:00', end: '07:00' } }
    })
    await loadSettings()
    expect(getSettings()).toEqual({
      petVisible: false,
      packId: '_example',
      busFavorites: [],
      busPoll: DEFAULT_BUS_POLL
    })
  })
})
