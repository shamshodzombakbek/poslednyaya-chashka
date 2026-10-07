import type { Order, RecipeId } from '../game/types'
import { recipes } from '../data/recipes'

export interface BrewResult {
  ok: boolean
  waste: boolean
  message: string
  done?: boolean
}

export function sameSteps(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((step, i) => step === b[i])
}

export function brewClick(order: Order, kind: 'cup' | 'ing' | 'cook' | 'undo', id = ''): BrewResult {
  const recipe = recipes[order.recipeId]
  if (order.brewed) return { ok: false, waste: false, message: 'Напиток уже собран. Его можно отнести.' }

  if (kind === 'undo') {
    if (order.steps.length) order.steps.pop()
    else if (order.cup) order.cup = null
    else return { ok: false, waste: false, message: 'Убирать пока нечего.' }
    order.mistakes += 1
    return { ok: true, waste: true, message: 'Вылила и начала шаг заново. Ушли время и продукты.' }
  }

  if (kind === 'cup') {
    if (order.steps.length) {
      return { ok: false, waste: false, message: 'Сначала вылей напиток, потом меняй чашку.' }
    }
    order.cup = id
    if (id !== recipe.cup) {
      order.mistakes += 1
      return { ok: true, waste: true, message: 'Эта чашка не для такого заказа. Можно заменить.' }
    }
    return { ok: true, waste: false, message: 'Чашка подходит.' }
  }

  if (kind === 'ing') {
    if (!order.cup) return { ok: false, waste: false, message: 'Сначала выбери чашку.' }
    const expect = recipe.steps[order.steps.length]
    if (id !== expect) {
      order.mistakes += 1
      return { ok: true, waste: true, message: 'Это лишнее. Ничего не добавлено — шаг можно повторить.' }
    }
    order.steps.push(id)
    return { ok: true, waste: false, message: 'Добавлено.' }
  }

  if (!order.cup || order.cup !== recipe.cup) {
    return { ok: false, waste: false, message: 'Нужна другая чашка. Сверься с блокнотом, если чек плывёт.' }
  }
  if (!sameSteps(order.steps, recipe.steps)) {
    return { ok: false, waste: false, message: 'Состав пока не тот. Лишнее можно убрать.' }
  }
  order.brewed = true
  return { ok: true, waste: false, done: true, message: `${recipe.name} готов. Отнеси его.` }
}

/** Искажение текста не имеет права подменять рецепт. */
export function recipeIdentity(id: RecipeId): RecipeId {
  return recipes[id].id
}
