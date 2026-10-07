export type Phase = 'morning' | 'day' | 'evening' | 'night'
export type RecipeId = 'espresso' | 'americano' | 'cappuccino' | 'tea'
export type ScaleKey = 'fear' | 'depression' | 'social' | 'fatigue'
export type EndingId = 'good' | 'middle' | 'crisis'
export type ActionId =
  | 'breath'
  | 'shortBreak'
  | 'water'
  | 'food'
  | 'colleague'
  | 'notebook'
  | 'lights'

export interface Order {
  uid: number
  recipeId: RecipeId
  customerName: string
  cup: string | null
  steps: string[]
  brewed: boolean
  served: boolean
  paid: boolean
  mistakes: number
}

export interface HistoryDay {
  day: number
  fear: number
  depression: number
  social: number
  fatigue: number
  peakFear: number
  peakDepression: number
  peakSocial: number
}

export interface DayReport {
  closedDay: number
  nextDay: number | null
  earned: number
  served: number
  mistakes: number
  left: number
  rest: string[]
  notes: string[]
  achievement: string
  before: Record<ScaleKey, number>
  afterSleep: Record<ScaleKey, number> | null
  ending: EndingId | null
}
