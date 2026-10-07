import { balance } from '../data/balance'

export interface StageInput {
  day: number
  fear: number
  depression: number
  fatigue: number
  minute: number
  suppressUntil: number
}

/** Игровая стадия перегруза восприятия. Не диагноз. */
export function rawStage(input: StageInput): 0 | 1 | 2 | 3 {
  const d = balance.distortion
  const s3 =
    input.fatigue >= d.stage3.fatigue &&
    input.fear >= d.stage3.fear &&
    input.depression >= d.stage3.depression
  if (s3) return 3
  const s2 =
    (input.fatigue >= d.stage2.fatigue &&
      (input.fear >= d.stage2.fear || input.depression >= d.stage2.depression)) ||
    input.fear >= 74
  if (s2) return 2
  const s1 = input.fatigue >= d.stage1.fatigue || input.fear >= d.stage1.fear
  if (s1) return 1
  return 0
}

export function visualStage(input: StageInput, reduceVisual: boolean): 0 | 1 | 2 | 3 {
  let stage = rawStage(input)
  if (input.minute < input.suppressUntil) stage = 0
  if (input.day <= balance.distortion.tutorialCapDay) {
    stage = Math.min(stage, balance.distortion.tutorialCap) as 0 | 1 | 2 | 3
  }
  if (reduceVisual) stage = Math.min(stage, 1) as 0 | 1 | 2 | 3
  return stage
}

export function inCrisisBand(fear: number, depression: number, social: number, fatigue: number, day: number): boolean {
  const c = balance.crisis
  return (
    day >= c.minDay &&
    fear >= c.scaleThreshold &&
    depression >= c.scaleThreshold &&
    social >= c.scaleThreshold &&
    fatigue >= c.fatigueThreshold
  )
}
