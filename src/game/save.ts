import { game, type Session } from './session'
import type { EndingId } from './types'

const SAVE_KEY = 'poslednyaya-chashka-save-v1'
const SETTINGS_KEY = 'poslednyaya-chashka-settings-v1'

export interface SaveBlob {
  version: 1
  day: number
  money: number
  fear: number
  depression: number
  social: number
  fatigue: number
  resilience: number
  supportUses: number
  restDays: number
  totalServed: number
  history: Session['history']
  completedEnding: EndingId | null
}

function mem(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

export function loadSettings(): void {
  const raw = mem()?.getItem(SETTINGS_KEY)
  if (!raw) return
  try {
    const data = JSON.parse(raw) as Partial<Session['settings']>
    game.settings = { ...game.settings, ...data, dev: game.settings.dev }
  } catch {
    /* ignore broken settings */
  }
}

export function saveSettings(): void {
  const { sfx, ambient, reduceFlicker, reduceDistortion } = game.settings
  mem()?.setItem(SETTINGS_KEY, JSON.stringify({ sfx, ambient, reduceFlicker, reduceDistortion }))
}

export function saveGame(): void {
  const blob: SaveBlob = {
    version: 1,
    day: game.day,
    money: game.money,
    fear: game.fear,
    depression: game.depression,
    social: game.social,
    fatigue: game.fatigue,
    resilience: game.resilience,
    supportUses: game.supportUses,
    restDays: game.restDays,
    totalServed: game.totalServed,
    history: game.history,
    completedEnding: game.completedEnding,
  }
  mem()?.setItem(SAVE_KEY, JSON.stringify(blob))
}

export function readSave(): SaveBlob | null {
  const raw = mem()?.getItem(SAVE_KEY)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as SaveBlob
    if (data.version !== 1) return null
    return data
  } catch {
    return null
  }
}

export function continuable(): boolean {
  const data = readSave()
  return Boolean(data && !data.completedEnding && data.day >= 1 && data.day <= 30)
}

export function applySave(data: SaveBlob): void {
  game.day = data.day
  game.money = data.money
  game.fear = data.fear
  game.depression = data.depression
  game.social = data.social
  game.fatigue = data.fatigue
  game.resilience = data.resilience
  game.supportUses = data.supportUses
  game.restDays = data.restDays
  game.totalServed = data.totalServed
  game.history = data.history ?? []
  game.completedEnding = data.completedEnding
  game.prepareMorning(false)
  game.shiftLocked = false
  game.lastReport = null
}

export function clearSave(): void {
  mem()?.removeItem(SAVE_KEY)
}
