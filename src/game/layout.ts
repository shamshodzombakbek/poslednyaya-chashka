/** Общая карта кофейни. Коллизии и точки взаимодействия берутся отсюда. */
export const WORLD = { w: 1440, h: 960 }

export interface Block {
  x: number
  y: number
  w: number
  h: number
  kind: 'wall' | 'table' | 'machine' | 'sink' | 'bed' | 'food'
}

export const blocks: Block[] = [
  { x: 0, y: 64, w: 1440, h: 32, kind: 'wall' },
  { x: 0, y: 64, w: 32, h: 896, kind: 'wall' },
  { x: 1408, y: 64, w: 32, h: 896, kind: 'wall' },
  { x: 0, y: 900, w: 460, h: 60, kind: 'wall' },
  { x: 680, y: 900, w: 760, h: 60, kind: 'wall' },
  { x: 860, y: 96, w: 28, h: 80, kind: 'wall' },
  { x: 860, y: 250, w: 28, h: 90, kind: 'wall' },
  { x: 860, y: 520, w: 28, h: 160, kind: 'wall' },
  { x: 860, y: 790, w: 28, h: 110, kind: 'wall' },
  { x: 1180, y: 96, w: 24, h: 84, kind: 'wall' },
  { x: 1180, y: 250, w: 24, h: 112, kind: 'wall' },
  { x: 1180, y: 340, w: 228, h: 22, kind: 'wall' },
  { x: 886, y: 700, w: 180, h: 24, kind: 'wall' },
  { x: 1220, y: 700, w: 188, h: 24, kind: 'wall' },
  { x: 150, y: 250, w: 100, h: 54, kind: 'table' },
  { x: 390, y: 250, w: 100, h: 54, kind: 'table' },
  { x: 150, y: 500, w: 100, h: 54, kind: 'table' },
  { x: 420, y: 540, w: 100, h: 54, kind: 'table' },
  { x: 980, y: 250, w: 110, h: 58, kind: 'machine' },
  { x: 1248, y: 250, w: 86, h: 50, kind: 'sink' },
  { x: 1248, y: 800, w: 110, h: 40, kind: 'bed' },
  { x: 1030, y: 800, w: 80, h: 40, kind: 'food' },
]

export const spots = {
  machine: { x: 1030, y: 360 },
  sink: { x: 1288, y: 360 },
  storage: { x: 1288, y: 200 },
  nina: { x: 1000, y: 210 },
  light: { x: 930, y: 160 },
  window: { x: 250, y: 150 },
  food: { x: 1070, y: 760 },
  bed: { x: 1288, y: 760 },
  notebook: { x: 1088, y: 470 },
}

export const queues = [
  { x: 760, y: 400 },
  { x: 700, y: 500 },
  { x: 760, y: 580 },
]

export const seats = [
  { x: 200, y: 340 },
  { x: 440, y: 340 },
  { x: 200, y: 590 },
  { x: 470, y: 640 },
]

export const spawnPoint = { x: 560, y: 850 }
export const playerStart = { x: 680, y: 470 }

export const zoneLabels: { text: string; x: number; y: number }[] = [
  { text: 'зал', x: 480, y: 180 },
  { text: 'вход', x: 540, y: 820 },
  { text: 'кофемашина', x: 990, y: 230 },
  { text: 'мойка', x: 1260, y: 230 },
  { text: 'подсобка', x: 1240, y: 140 },
  { text: 'комната отдыха', x: 1080, y: 740 },
]
