import { getArrivals } from '@main/bus/arrivalPoller'
import { nearbyStops, routePath, searchStops, stopRoutes, testBusKey } from '@main/bus/client'
import { isSameFavorite, reorderFavorites } from '@main/bus/favorites'
import { busPollSettingsSchema } from '@main/bus/pollPlan'
import { busFavoriteSchema, TAGO_ID_PATTERN } from '@main/bus/tago'
import { handle } from '@main/ipc'
import { getSettings, MAX_BUS_FAVORITES, updateSettings } from '@main/store/settings'
import type { AddFavoriteResult, BusFavorite, BusFavoriteKey } from '@preload/api'
import { IPC } from '@preload/channels'
import { z } from 'zod'

const tagoId = z.string().regex(TAGO_ID_PATTERN)
/** 대전 근처만 — 지도가 엉뚱한 곳을 가리키면 호출하지 않는다 */
const coordinates = z.object({
  lat: z.number().min(35.9).max(36.7),
  lng: z.number().min(127).max(127.8)
})
const favoriteKey = z.object({ stopId: tagoId, routeId: tagoId.nullable() })
const favoriteAlert = z.object({ stopId: tagoId, routeId: tagoId, enabled: z.boolean() })

function addFavorite(favorite: BusFavorite): AddFavoriteResult {
  const favorites = getSettings().busFavorites
  const key = { stopId: favorite.stop.id, routeId: favorite.route?.id ?? null }
  const exists = favorites.some((saved) => isSameFavorite(saved, key))
  if (exists) return { ok: true }
  if (favorites.length >= MAX_BUS_FAVORITES) {
    return { ok: false, reason: 'limit', limit: MAX_BUS_FAVORITES }
  }
  updateSettings({ busFavorites: [...favorites, favorite] })
  return { ok: true }
}

function removeFavorite(key: BusFavoriteKey): void {
  const favorites = getSettings().busFavorites
  updateSettings({ busFavorites: favorites.filter((favorite) => !isSameFavorite(favorite, key)) })
}

function setFavoriteAlert({ enabled, ...key }: z.output<typeof favoriteAlert>): void {
  const favorites = getSettings().busFavorites
  updateSettings({
    busFavorites: favorites.map((favorite) =>
      isSameFavorite(favorite, key) ? { ...favorite, alert: enabled } : favorite
    )
  })
}

export function registerBusIpc(): void {
  const allow = ['main'] as const
  handle(IPC.busTestKey, { allow, payload: z.undefined() }, testBusKey)
  handle(IPC.busNearbyStops, { allow, payload: coordinates }, ({ lat, lng }) =>
    nearbyStops(lat, lng)
  )
  handle(IPC.busSearchStops, { allow, payload: z.string().trim().min(1).max(30) }, searchStops)
  handle(IPC.busStopRoutes, { allow, payload: tagoId }, stopRoutes)
  handle(IPC.busRoutePath, { allow, payload: tagoId }, routePath)
  handle(IPC.busAddFavorite, { allow, payload: busFavoriteSchema }, addFavorite)
  handle(IPC.busRemoveFavorite, { allow, payload: favoriteKey }, removeFavorite)
  handle(
    IPC.busReorderFavorites,
    { allow, payload: z.array(favoriteKey).max(MAX_BUS_FAVORITES) },
    (order) => updateSettings({ busFavorites: reorderFavorites(getSettings().busFavorites, order) })
  )
  handle(IPC.busGetArrivals, { allow, payload: z.undefined() }, getArrivals)
  handle(IPC.busSetPollSettings, { allow, payload: busPollSettingsSchema }, (busPoll) =>
    updateSettings({ busPoll })
  )
  handle(IPC.busSetFavoriteAlert, { allow, payload: favoriteAlert }, setFavoriteAlert)
}
