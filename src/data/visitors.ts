import type { Phase, RecipeId } from '../game/types'
import { recipes } from './recipes'

export interface VisitorDef {
  id: string
  name: string
  kind: string
  dialogue: string
  minDay: number
  dayWeight: number
  nightWeight: number
  patience: number
  /** Сколько терпения уходит за игровую минуту ожидания. */
  drain: number
  orderPool: RecipeId[]
  sits: boolean
  returning: boolean
  canUncanny: boolean
}

export const visitors: VisitorDef[] = [
  {
    id: 'sonya',
    name: 'Соня',
    kind: 'постоянная гостья',
    dialogue: 'sonya',
    minDay: 1,
    dayWeight: 4,
    nightWeight: 2,
    patience: 100,
    drain: 0.4,
    orderPool: ['cappuccino', 'tea'],
    sits: true,
    returning: true,
    canUncanny: true,
  },
  {
    id: 'igor',
    name: 'Игорь',
    kind: 'торопится с работы',
    dialogue: 'igor',
    minDay: 1,
    dayWeight: 4,
    nightWeight: 0.4,
    patience: 100,
    drain: 0.85,
    orderPool: ['americano', 'espresso'],
    sits: false,
    returning: false,
    canUncanny: false,
  },
  {
    id: 'leonid',
    name: 'Леонид',
    kind: 'говорит мало',
    dialogue: 'leonid',
    minDay: 2,
    dayWeight: 3,
    nightWeight: 2,
    patience: 100,
    drain: 0.5,
    orderPool: ['tea', 'americano'],
    sits: true,
    returning: false,
    canUncanny: false,
  },
  {
    id: 'marina',
    name: 'Марина',
    kind: 'любит поговорить',
    dialogue: 'marina',
    minDay: 3,
    dayWeight: 3,
    nightWeight: 1,
    patience: 100,
    drain: 0.45,
    orderPool: ['cappuccino', 'tea'],
    sits: true,
    returning: false,
    canUncanny: false,
  },
  {
    id: 'pavel',
    name: 'Павел',
    kind: 'недоволен сервисом',
    dialogue: 'pavel',
    minDay: 4,
    dayWeight: 2.2,
    nightWeight: 1.2,
    patience: 100,
    drain: 0.7,
    orderPool: ['espresso', 'americano'],
    sits: false,
    returning: false,
    canUncanny: false,
  },
  {
    id: 'alina',
    name: 'Алина',
    kind: 'говорит за компанию',
    dialogue: 'alina',
    minDay: 6,
    dayWeight: 2.4,
    nightWeight: 0.5,
    patience: 100,
    drain: 0.8,
    orderPool: ['cappuccino', 'tea'],
    sits: true,
    returning: false,
    canUncanny: false,
  },
  {
    id: 'renata',
    name: 'Рената',
    kind: 'ночная гостья',
    dialogue: 'renata',
    minDay: 5,
    dayWeight: 0.45,
    nightWeight: 3.4,
    patience: 100,
    drain: 0.42,
    orderPool: ['tea', 'americano'],
    sits: false,
    returning: false,
    canUncanny: false,
  },
  {
    id: 'gleb',
    name: 'Глеб',
    kind: 'тихий, выглядит сурово',
    dialogue: 'gleb',
    minDay: 7,
    dayWeight: 0.55,
    nightWeight: 2.8,
    patience: 100,
    drain: 0.4,
    orderPool: ['tea', 'espresso'],
    sits: true,
    returning: true,
    canUncanny: false,
  },
]

export function drinkOf(id: RecipeId): string {
  return recipes[id].nameAcc
}

export function pickRecipe(def: VisitorDef, rng: () => number): RecipeId {
  const pool = def.orderPool
  return pool[Math.floor(rng() * pool.length)] ?? 'tea'
}

export function pickVisitorId(opts: {
  day: number
  phase: Phase
  forced: string | null
  rng: () => number
}): string | null {
  if (opts.forced) return opts.forced
  const night = opts.phase === 'night' || opts.phase === 'evening'
  const pool = visitors.filter((v) => v.minDay <= opts.day)
  let sum = 0
  const weights = pool.map((v) => {
    const w = night ? v.nightWeight : v.dayWeight
    sum += w
    return w
  })
  if (sum <= 0) return null
  let roll = opts.rng() * sum
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i] ?? 0
    if (roll <= 0) return pool[i]!.id
  }
  return pool[pool.length - 1]?.id ?? null
}

export function visitorById(id: string): VisitorDef {
  const found = visitors.find((v) => v.id === id)
  if (!found) throw new Error(`unknown visitor ${id}`)
  return found
}
