import { broadcast, handle } from '@main/ipc'
import { IPC } from '@preload/channels'
import { z } from 'zod'

type Listener = (visible: boolean) => void

let petVisible = true
const listeners = new Set<Listener>()

export function isPetVisible(): boolean {
  return petVisible
}

export function setPetVisible(visible: boolean): void {
  if (visible === petVisible) return
  petVisible = visible
  for (const listener of listeners) listener(visible)
  broadcast(IPC.petVisibleChanged, visible)
}

export function onPetVisibleChange(listener: Listener): void {
  listeners.add(listener)
}

export function registerPetVisibilityIpc(): void {
  handle(IPC.petGetVisible, { allow: ['main', 'overlay'], payload: z.undefined() }, isPetVisible)
  handle(IPC.petSetVisible, { allow: ['main'], payload: z.boolean() }, setPetVisible)
}
