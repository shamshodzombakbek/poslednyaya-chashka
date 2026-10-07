import { balance } from '../data/balance'
import type { EndingId, HistoryDay } from './types'

export interface EndingInput {
  day: number
  fear: number
  depression: number
  social: number
  restDays: number
  totalServed: number
  resilience: number
  supportUses: number
  history: HistoryDay[]
}

export function isStable(day: HistoryDay): boolean {
  const g = balance.good
  return (
    day.fear < g.stableEnd &&
    day.depression < g.stableEnd &&
    day.social < g.stableEnd &&
    day.peakFear < g.stablePeak &&
    day.peakDepression < g.stablePeak &&
    day.peakSocial < g.stablePeak
  )
}

export function isGoodEnding(input: EndingInput): boolean {
  const g = balance.good
  if (input.day < 30) return false
  if (input.fear >= g.maxScale || input.depression >= g.maxScale || input.social >= g.maxScale) return false
  if (input.restDays < g.minRestDays) return false
  if (input.totalServed < g.minServed) return false
  if (input.resilience < g.minResilience) return false
  if (input.supportUses < g.minSupport) return false
  const last = input.history.slice(-g.stableDays)
  if (last.length < g.stableDays) return false
  return last.every(isStable)
}

export function evaluateEnding(input: EndingInput): EndingId | null {
  if (input.day < 30) return null
  return isGoodEnding(input) ? 'good' : 'middle'
}

export const endingText: Record<EndingId, { title: string; body: string }> = {
  good: {
    title: 'Смена, которую можно повторить',
    body:
      'Тридцать дней позади. Кира всё ещё устаёт, и тишина ночной смены иногда звенит слишком громко. Но она научилась останавливаться, просить Нину о помощи и возвращаться к людям небольшими разговорами — не через силу. Это не выздоровление и не финал. Это месяц, который она смогла прожить и закрыть сама.',
  },
  middle: {
    title: 'Более короткий график',
    body:
      'Кира доработала до тридцатого дня. Ей по-прежнему тяжело: сон рвётся, а длинные разговоры стоят слишком много. Вместе с Ниной она выбирает более посильные смены и поддержку, без которой следующие недели лучше не начинать. Остаться — тоже решение. Остаться бережнее — тоже.',
  },
  crisis: {
    title: 'Пауза',
    body:
      'Нагрузка держалась слишком долго, а помощь была рядом: дыхание, еда, Нина, блокнот, сон. Кира не смогла к ней повернуться вовремя. Нина тихо закрывает кассу и уводит её из зала. Смена окончена. Впереди не приговор, а передышка: сон, еда и люди, которые побудут рядом, пока станет чуть легче.',
  },
}
