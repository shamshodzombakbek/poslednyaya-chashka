import type { ActionId, Phase } from '../game/types'

export interface ActionTune {
  limit: number
  cooldown: number
  minutes: number
  diminish: number
  fear?: number
  depression?: number
  social?: number
  fatigue?: number
}

/**
 * Все пороги вынесены сюда, чтобы концовки и нагрузку можно было крутить
 * без правки сцен. Шкалы: 0 — легче, 100 — тяжелее.
 */
export const balance = {
  scalesMax: 100,

  start: {
    fear: 32,
    depression: 46,
    social: 54,
    fatigue: 26,
    money: 0,
  },

  time: {
    /** Реальных секунд на одну игровую минуту при скорости 1×. Смена 8:00–02:00 ≈ 10 минут. */
    secondsPerGameMinute: 0.55,
    startMinute: 8 * 60,
    dayMinute: 12 * 60,
    eveningMinute: 17 * 60,
    nightMinute: 21 * 60,
    /** 02:00 следующих суток — Нина закрывает кассу. */
    forceEndMinute: 26 * 60,
  },

  fatiguePerMinute: 0.028,
  nightFatigueMul: 1.45,
  /** Страх копится в темноте ночью и пакетом пишется в журнал каждые 5 пунктов. */
  darkFearPerMinute: 0.06,

  sleep: {
    fear: -8,
    depression: -12,
    social: -14,
    fatigue: -36,
  },

  /** Если за день никого не обслужила сама, сон восстанавливает только часть. */
  isolationSleepMul: 0.45,
  isolation: {
    depression: 14,
    social: 8,
  },

  /** Небольшой законченный объём работы чуть снижает депрессивную нагрузку. */
  goalServed: { min: 1, max: 6, depression: -2 },
  overwork: {
    served: 8,
    fatigue: 75,
    depression: 6,
    fear: 3,
  },

  serve: {
    fatigue: 3,
    depression: -1,
  },

  left: {
    depression: 2,
  },

  cover: {
    payMul: 0.45,
    depression: 2,
  },

  waste: {
    minutes: 3,
    money: 15,
    fatigue: 1,
  },

  stepMinutes: 1.4,

  crisis: {
    minDay: 4,
    /** Все три основные шкалы должны быть не ниже этого порога одновременно. */
    scaleThreshold: 84,
    fatigueThreshold: 78,
    /** Сколько игровых минут держится перегруз, если помощью не пользуются. */
    durationMinutes: 480,
    /** Недавняя помощь на это время останавливает рост кризисного счётчика. */
    helpMemoryMinutes: 45,
    /** Доля, которая остаётся от счётчика после действия помощи. */
    meterKeep: 0.35,
  },

  distortion: {
    /** Дни 1–3: визуальная стадия не выше 1. */
    tutorialCapDay: 3,
    tutorialCap: 1 as const,
    stage1: { fatigue: 42, fear: 48 },
    stage2: { fatigue: 62, fear: 58, depression: 68 },
    stage3: { fatigue: 78, fear: 70, depression: 64 },
    suppressMinutes: 25,
  },

  good: {
    maxScale: 35,
    stableEnd: 50,
    stablePeak: 75,
    minRestDays: 16,
    minServed: 36,
    minResilience: 6,
    minSupport: 8,
    stableDays: 3,
  },

  resilienceCap: 12,
  socialMulFloor: 0.35,
  resilienceStep: 0.08,

  actions: {
    breath: { limit: 6, cooldown: 10, minutes: 3, diminish: 0.72, fear: -10, social: -3 },
    shortBreak: { limit: 4, cooldown: 25, minutes: 20, diminish: 0.65, fatigue: -14, social: -10, fear: -3 },
    water: { limit: 4, cooldown: 12, minutes: 5, diminish: 0.75, fatigue: -4, depression: -3 },
    food: { limit: 3, cooldown: 40, minutes: 15, diminish: 0.7, depression: -8, fatigue: -8 },
    colleague: { limit: 3, cooldown: 18, minutes: 10, diminish: 0.7, fear: -8, social: -6, depression: -4 },
    notebook: { limit: 8, cooldown: 8, minutes: 2, diminish: 0.6, fear: -6 },
    lights: { limit: 99, cooldown: 8, minutes: 0, diminish: 1, fear: -4 },
  } as Record<ActionId, ActionTune>,
}

export const phaseNames: Record<Phase, string> = {
  morning: 'утро',
  day: 'день',
  evening: 'вечер',
  night: 'ночь',
}

export const scaleNames = {
  fear: 'Страх',
  depression: 'Депрессивная нагрузка',
  social: 'Социальное напряжение',
  fatigue: 'Усталость',
} as const

export function phaseOf(minute: number): Phase {
  const t = balance.time
  if (minute >= t.nightMinute) return 'night'
  if (minute >= t.eveningMinute) return 'evening'
  if (minute >= t.dayMinute) return 'day'
  return 'morning'
}

export function formatClock(minute: number): string {
  const wrapped = minute >= 24 * 60 ? minute - 24 * 60 : minute
  const h = Math.floor(wrapped / 60)
  const m = Math.floor(wrapped % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
