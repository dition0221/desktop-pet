import { handle } from '@main/ipc'
import { forEachOverlay } from '@main/overlayWindows'
import { holdPetStillUntil } from '@main/pet/controller'
import type { PetSpeech } from '@preload/api'
import { IPC } from '@preload/channels'
import { z } from 'zod'

/** 한 문장을 읽고 알아챌 만큼 — 여러 개면 오버레이가 차례로 보여 준다 */
const SPEECH_DURATION_MS = 8000

let nextId = 1
/** 오버레이가 말풍선을 차례로 띄우므로 마지막 말풍선이 끝나는 시각까지 펫을 세워 둔다 */
let speakingUntil = 0
/** 아직 다 보여 주지 못한 말풍선 — 오버레이가 새로 뜨면 가져간다 */
let recent: { speech: PetSpeech; endsAt: number }[] = []

export function sayToPet(text: string): void {
  const now = Date.now()
  const speech: PetSpeech = { id: nextId++, text, durationMs: SPEECH_DURATION_MS }
  speakingUntil = Math.max(now, speakingUntil) + SPEECH_DURATION_MS
  recent = [...recent.filter((item) => item.endsAt > now), { speech, endsAt: speakingUntil }]
  holdPetStillUntil(speakingUntil)
  forEachOverlay((window) => window.webContents.send(IPC.petSpeech, speech))
}

export function registerSpeechIpc(): void {
  handle(IPC.petGetRecentSpeeches, { allow: ['overlay'], payload: z.undefined() }, () => {
    const now = Date.now()
    return recent.filter((item) => item.endsAt > now).map((item) => item.speech)
  })
}
