import { forEachOverlay } from '@main/overlayWindows'
import { holdPetStillUntil } from '@main/pet/controller'
import type { PetSpeech } from '@preload/api'
import { IPC } from '@preload/channels'

/** 한 문장을 읽고 알아챌 만큼 — 여러 개면 오버레이가 차례로 보여 준다 */
const SPEECH_DURATION_MS = 8000

/** 오버레이가 말풍선을 차례로 띄우므로 마지막 말풍선이 끝나는 시각까지 펫을 세워 둔다 */
let speakingUntil = 0

export function sayToPet(text: string): void {
  const speech: PetSpeech = { text, durationMs: SPEECH_DURATION_MS }
  speakingUntil = Math.max(Date.now(), speakingUntil) + SPEECH_DURATION_MS
  holdPetStillUntil(speakingUntil)
  forEachOverlay((window) => window.webContents.send(IPC.petSpeech, speech))
}
