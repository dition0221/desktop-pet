import { isAppPageUrl } from '@main/appPage'
import { BrowserWindow, type IpcMainInvokeEvent, ipcMain } from 'electron'
import type { z } from 'zod'

export type WindowRole = 'main' | 'overlay'

const windowRoles = new Map<number, WindowRole>()

export function registerWindowRole(window: BrowserWindow, role: WindowRole): void {
  const { webContents } = window
  const id = webContents.id
  windowRoles.set(id, role)
  webContents.once('destroyed', () => windowRoles.delete(id))
}

/** 하위 frame이나 앱 밖 페이지에서 온 요청은 역할이 있는 창이어도 거부 */
function resolveSenderRole(event: IpcMainInvokeEvent): WindowRole | null {
  const frame = event.senderFrame
  if (!frame || frame !== event.sender.mainFrame || !isAppPageUrl(frame.url)) return null
  return windowRoles.get(event.sender.id) ?? null
}

interface HandleOptions<S extends z.ZodType> {
  allow: readonly WindowRole[]
  /** 인자가 없는 채널은 `z.undefined()` */
  payload: S
}

export function handle<S extends z.ZodType>(
  channel: string,
  { allow, payload }: HandleOptions<S>,
  handler: (payload: z.output<S>, event: IpcMainInvokeEvent) => unknown
): void {
  ipcMain.handle(channel, (event, ...args: unknown[]) => {
    const role = resolveSenderRole(event)
    if (!role || !allow.includes(role)) throw new Error(`${channel}: sender not allowed`)
    const parsed = args.length <= 1 ? payload.safeParse(args[0]) : null
    if (!parsed?.success) throw new Error(`${channel}: invalid payload`)
    return handler(parsed.data, event)
  })
}

export function broadcast(channel: string, payload: unknown, to: readonly WindowRole[]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    const role = windowRoles.get(window.webContents.id)
    if (role && to.includes(role)) window.webContents.send(channel, payload)
  }
}
