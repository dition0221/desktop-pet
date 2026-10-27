/** 메인·preload가 공유하는 IPC 채널 — 렌더러는 import 금지 (Biome override) */
export const IPC = {
  settingsGet: 'settings:get',
  settingsChanged: 'settings:changed',
  packList: 'pack:list',
  packSelect: 'pack:select',
  secretsGetStatus: 'secrets:get-status',
  secretsSave: 'secrets:save',
  secretsDelete: 'secrets:delete',
  petSetVisible: 'pet:set-visible',
  petGetSprite: 'pet:get-sprite',
  petSpriteChanged: 'pet:sprite-changed',
  petGetMotion: 'pet:get-motion',
  petMotionChanged: 'pet:motion-changed',
  petOpenMainWindow: 'pet:open-main-window',
  petShowContextMenu: 'pet:show-context-menu'
} as const
