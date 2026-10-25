import type { DesktopPetApi } from '@preload/api'

declare global {
  interface Window {
    api: DesktopPetApi
  }
}
