import type { RecipeId } from '../game/types'

export interface Recipe {
  id: RecipeId
  name: string
  nameAcc: string
  price: number
  cup: string
  steps: string[]
  brew: string
}

export const cups: { id: string; label: string }[] = [
  { id: 'demitasse', label: 'Чашка для эспрессо' },
  { id: 'mug', label: 'Большая чашка' },
  { id: 'wide', label: 'Чашка для капучино' },
  { id: 'tea', label: 'Чайная чашка' },
]

export const ingredients: { id: string; label: string }[] = [
  { id: 'espresso', label: 'Эспрессо' },
  { id: 'water', label: 'Горячая вода' },
  { id: 'milk', label: 'Молоко' },
  { id: 'tea', label: 'Чай' },
  { id: 'steam', label: 'Взбить паром' },
]

export const recipes: Record<RecipeId, Recipe> = {
  espresso: {
    id: 'espresso',
    name: 'Эспрессо',
    nameAcc: 'эспрессо',
    price: 140,
    cup: 'demitasse',
    steps: ['espresso'],
    brew: 'Пролить эспрессо',
  },
  americano: {
    id: 'americano',
    name: 'Американо',
    nameAcc: 'американо',
    price: 160,
    cup: 'mug',
    steps: ['espresso', 'water'],
    brew: 'Собрать американо',
  },
  cappuccino: {
    id: 'cappuccino',
    name: 'Капучино',
    nameAcc: 'капучино',
    price: 190,
    cup: 'wide',
    steps: ['espresso', 'milk', 'steam'],
    brew: 'Собрать капучино',
  },
  tea: {
    id: 'tea',
    name: 'Чай',
    nameAcc: 'чай',
    price: 130,
    cup: 'tea',
    steps: ['tea', 'water'],
    brew: 'Заварить чай',
  },
}

export const cupLabel = (id: string) => cups.find((c) => c.id === id)?.label ?? id
export const ingLabel = (id: string) => ingredients.find((c) => c.id === id)?.label ?? id
