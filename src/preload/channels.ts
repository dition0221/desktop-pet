/** 메인·preload가 공유하는 IPC 채널 — 렌더러는 import 금지 (Biome override) */
export const IPC = {
  petGetVisible: 'pet:get-visible',
  petSetVisible: 'pet:set-visible',
  petVisibleChanged: 'pet:visible-changed',
  petGetSprite: 'pet:get-sprite',
  petGetMotion: 'pet:get-motion',
  petMotionChanged: 'pet:motion-changed',
  petOpenMainWindow: 'pet:open-main-window',
  petShowContextMenu: 'pet:show-context-menu'
} as const
