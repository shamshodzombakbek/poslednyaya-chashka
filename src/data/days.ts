export interface DayPlan {
  day: number
  tier: number
  spawnMinutes: number
  maxWaiting: number
  spawnCap: number
  firstId: string | null
  intro: string | null
}

const tiers = [
  { spawnMinutes: 72, maxWaiting: 1, spawnCap: 4 },
  { spawnMinutes: 56, maxWaiting: 2, spawnCap: 7 },
  { spawnMinutes: 48, maxWaiting: 2, spawnCap: 9 },
  { spawnMinutes: 44, maxWaiting: 3, spawnCap: 10 },
  { spawnMinutes: 64, maxWaiting: 2, spawnCap: 5 },
]

export function planFor(day: number): DayPlan {
  const clamped = Math.min(30, Math.max(1, day))
  const tier = clamped <= 3 ? 0 : clamped <= 10 ? 1 : clamped <= 20 ? 2 : clamped < 30 ? 3 : 4
  const row = tiers[tier]!
  return {
    day: clamped,
    tier,
    ...row,
    firstId: clamped === 1 || clamped === 30 ? 'sonya' : null,
    intro: introFor(clamped),
  }
}

function introFor(day: number): string | null {
  if (day === 1) {
    return 'Нина: Я на подмене, если станет шумно или страшно. Твоя работа — подойти, принять заказ, собрать напиток и отдать его. В подсобке можно посидеть, в комнате отдыха — поесть и закрыть смену. Не нужно обслуживать всех до утра.\n\nWASD или стрелки — ходить. E — действие. Esc — пауза. Блокнот всегда показывает настоящий заказ, даже если чек «плывёт».'
  }
  if (day === 4) {
    return 'Нина: Вечером холодильник иногда орёт. Это не гость. Если станет не по себе — позови меня или включи свет. Ночные люди бывают странными в вопросах и обычными в заказах.'
  }
  if (day === 11) {
    return 'Знакомые лица возвращаются. Если кто-то выглядит иначе, чем вчера, сверься с блокнотом: заказ от этого не меняется. Можно попросить Нину посмотреть в зал вместе с тобой.'
  }
  if (day === 21) {
    return 'Нина: Дальше не будет нового экзамена. Те же люди, те же напитки, те же паузы. Выбирай посильный кусок смены, а не геройство.'
  }
  if (day === 30) {
    return 'Нина: Последняя смена этого месяца. Соня, скорее всего, зайдёт. Не геройствуй до двух ночи. Я рядом и закрою кассу вместе с тобой, когда скажешь.'
  }
  return null
}

export function achievementFor(input: {
  day: number
  served: number
  left: number
  mistakes: number
  rest: string[]
  support: boolean
  boundary: boolean
  night: boolean
  fear: number
}): string {
  if (input.day === 1 && input.served >= 1) return 'Первый заказ доведён до конца.'
  if (input.support) return 'Ты попросила о помощи и смена от этого не развалилась.'
  if (input.boundary) return 'Ты обозначила границу и осталась в разговоре.'
  if (input.night && input.fear < 45 && input.served > 0) return 'Ночная часть смены прошла без срыва.'
  if (input.rest.length > 0 && input.served > 0) return 'Была и работа, и остановка. Так смена держится.'
  if (input.served >= 4 && input.mistakes <= 1) return 'Небольшая ровная смена, почти без переделок.'
  if (input.served === 0) return 'День почти без людей. Тишина не заменяет практику.'
  if (input.left > 0 && input.served > 0) return 'Кто-то не дождался. Остальные заказы ты всё же закрыла.'
  return 'Смена закончилась. Этого достаточно, чтобы уйти спать.'
}
