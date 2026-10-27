import type { ArrivalsSnapshot } from '@preload/api'
import { useMainValue } from '@renderer/shared/hooks/useMainValue'

export function useArrivals(): ArrivalsSnapshot | undefined {
  return useMainValue(window.api.bus.getArrivals, window.api.bus.onArrivalsChange)
}
