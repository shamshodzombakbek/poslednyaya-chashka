import { balance } from '../data/balance'
import { inCrisisBand, visualStage } from '../game/distort'
import { evaluateEnding, isGoodEnding } from '../game/endings'
import { brewClick, recipeIdentity } from '../game/orders'
import { Session } from '../game/session'
import { distortText } from '../game/textfx'
import type { Order } from '../game/types'

let failed = 0
function check(name: string, ok: boolean): void {
  if (!ok) {
    failed += 1
    console.error('FAIL', name)
  } else console.log('ok', name)
}

const order: Order = {
  uid: 1,
  recipeId: 'cappuccino',
  customerName: 'Соня',
  cup: null,
  steps: [],
  brewed: false,
  served: false,
  paid: false,
  mistakes: 0,
}
check('пустая готовка не проходит', !brewClick(order, 'cook').ok)
check('неверная чашка помечается', brewClick(order, 'cup', 'mug').waste)
order.cup = null
order.mistakes = 0
check('верная чашка', brewClick(order, 'cup', 'wide').ok && !brewClick(order, 'cup', 'wide').waste)
check('лишний ингредиент не попадает в состав', brewClick(order, 'ing', 'tea').waste && order.steps.length === 0)
check('порядок состава', brewClick(order, 'ing', 'espresso').ok && order.steps[0] === 'espresso')
brewClick(order, 'ing', 'milk')
brewClick(order, 'ing', 'steam')
const done = brewClick(order, 'cook')
check('капучино собирается', Boolean(done.done && order.brewed))
check('рецепт не подменяется текстом', recipeIdentity(order.recipeId) === 'cappuccino' && distortText('Капучино', 10) !== 'cappuccino')

const serve = new Session()
serve.openOrder(7, 'sonya', 'espresso')
serve.order!.cup = 'demitasse'
serve.order!.steps = ['espresso']
serve.brew('cook')
check('выдача один раз', serve.tryServe(7).ok && !serve.tryServe(7).ok)
check('чужому не отдаётся', (() => {
  const s = new Session()
  s.openOrder(1, 'igor', 'americano')
  s.order!.cup = 'mug'
  s.order!.steps = ['espresso', 'water']
  s.brew('cook')
  return !s.tryServe(2).ok && s.tryServe(1).ok
})())

const low = new Session()
low.mode = 'play'
const idle = low.tick(40)
check('спокойное ожидание не кризис', idle.signal !== 'crisis' && !low.completedEnding)

const clamped = new Session()
clamped.fear = 97
clamped.addScale('fear', 20, 'проверка')
check('шкала не выше 100', clamped.fear === 100)

const isolated = new Session()
isolated.day = 2
isolated.depression = 40
isolated.servedToday = 0
isolated.finishShift(true)
check('изоляция не лечится сном', isolated.depression > 40)

const slept = new Session()
slept.day = 2
slept.servedToday = 3
slept.fear = 90
slept.depression = 90
slept.social = 90
slept.fatigue = 90
const sleptReport = slept.finishShift(true)
check('сон не обнуляет шкалы', slept.fear > 50 && slept.depression > 50 && slept.fatigue > 20)
check('после сна есть утро', slept.day === 3 && sleptReport.afterSleep !== null)

const twice = new Session()
twice.day = 4
twice.servedToday = 2
const first = twice.finishShift(true)
const second = twice.finishShift(true)
check('смена не закрывается дважды', first.closedDay === 4 && second.closedDay === 4 && twice.day === 5)

const good = new Session()
const goodReport = good.debugResolve('good')
check('хорошая концовка считается правилами', goodReport.ending === 'good' && isGoodEnding({
  day: 30,
  fear: 22,
  depression: 22,
  social: 20,
  restDays: 21,
  totalServed: 48,
  resilience: 8,
  supportUses: 12,
  history: good.history,
}))

const middle = new Session()
check('промежуточная концовка', middle.debugResolve('middle').ending === 'middle')

const crisis = new Session()
check('кризис через порог и игнор помощи', crisis.debugResolve('crisis').ending === 'crisis')

const helped = new Session()
helped.debugPrepare('crisis')
helped.markHelp()
const meter = helped.crisisMeter
helped.tick = helped.tick.bind(helped)
check('помощь уменьшает кризисный счётчик', meter < balance.crisis.durationMinutes - 1)
check(
  'недавняя помощь не даёт мгновенный проигрыш',
  !inCrisisBand(10, 10, 10, 10, 10) && evaluateEnding({
    day: 10,
    fear: 90,
    depression: 90,
    social: 90,
    restDays: 0,
    totalServed: 0,
    resilience: 0,
    supportUses: 0,
    history: [],
  }) === null,
)

const seen = visualStage(
  { day: 12, fear: 80, depression: 80, fatigue: 85, minute: 100, suppressUntil: 200 },
  false,
)
check('блокнот гасит картинку, не правила', seen === 0)
check(
  'высокая нагрузка всё ещё видна без подавления',
  visualStage({ day: 12, fear: 80, depression: 80, fatigue: 85, minute: 300, suppressUntil: 0 }, false) === 3,
)
check(
  'обучение не прыгает в тяжёлую стадию',
  visualStage({ day: 2, fear: 90, depression: 90, fatigue: 90, minute: 10, suppressUntil: 0 }, false) <= 1,
)

if (failed) {
  throw new Error(`проверок провалено: ${failed}`)
}
console.log('все проверки логики прошли')
