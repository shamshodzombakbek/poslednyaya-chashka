import type { Phase } from '../game/types'

export type EventKind = 'figure' | 'steps' | 'fridge' | 'uncanny'

export interface GameEvent {
  id: string
  minDay: number
  phases: Phase[]
  /** Вероятность на одну проверку (примерно раз в полчаса игры). */
  chance: number
  minStage: 0 | 1 | 2 | 3
  perDay: number
  fear: number
  reason: string
  text: string
  kind: EventKind
}

export const events: GameEvent[] = [
  {
    id: 'fridge',
    minDay: 4,
    phases: ['evening', 'night'],
    chance: 0.62,
    minStage: 0,
    perDay: 1,
    fear: 3,
    reason: 'гул холодильника стал слишком громким',
    text: 'Холодильник тянет одну ноту. Это компрессор, не шаги. Можно подойти и проверить рукой.',
    kind: 'fridge',
  },
  {
    id: 'steps',
    minDay: 6,
    phases: ['evening', 'night'],
    chance: 0.4,
    minStage: 2,
    perDay: 1,
    fear: 4,
    reason: 'шаги в пустой части зала',
    text: 'В зале никого. Звук похож на шаги и сразу обрывается. Нина или блокнот помогают сверить это с комнатой.',
    kind: 'steps',
  },
  {
    id: 'figure',
    minDay: 8,
    phases: ['night'],
    chance: 0.34,
    minStage: 2,
    perDay: 1,
    fear: 6,
    reason: 'у окна кто-то стоял',
    text: 'За стеклом на миг темнеет силуэт. Подойди к окну ещё раз: если никого нет, так и есть.',
    kind: 'figure',
  },
  {
    id: 'uncanny',
    minDay: 11,
    phases: ['morning', 'day', 'evening', 'night'],
    chance: 0.36,
    minStage: 2,
    perDay: 1,
    fear: 4,
    reason: 'знакомое лицо выглядит иначе',
    text: 'Черты Сони будто немного съехали. Заказ в блокноте тот же. Это перегруз, не новый человек.',
    kind: 'uncanny',
  },
]

export function eventById(id: string): GameEvent | undefined {
  return events.find((e) => e.id === id)
}
