import { handle } from '@main/ipc'
import { getSettings, updateSettings } from '@main/store/settings'
import { IPC } from '@preload/channels'
import { z } from 'zod'

type Listener = (visible: boolean) => void

const listeners = new Set<Listener>()

export function isPetVisible(): boolean {
  return getSettings().petVisible
}

/** 메인 창에는 settings:changed로 전해진다 */
export function setPetVisible(visible: boolean): void {
  if (visible === isPetVisible()) return
  updateSettings({ petVisible: visible })
  for (const listener of listeners) listener(visible)
}

export function onPetVisibleChange(listener: Listener): void {
  listeners.add(listener)
}

export function registerPetVisibilityIpc(): void {
  handle(IPC.petSetVisible, { allow: ['main'], payload: z.boolean() }, setPetVisible)
}
