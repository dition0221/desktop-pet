import type { Settings } from '@preload/api'
import { useMainValue } from '@renderer/shared/hooks/useMainValue'

export function useSettings(): Settings | undefined {
  return useMainValue(window.api.settings.get, window.api.settings.onChange)
}
