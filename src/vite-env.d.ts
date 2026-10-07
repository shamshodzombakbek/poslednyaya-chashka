/// <reference types="vite/client" />

export {}

declare global {
  interface Window {
    __cup?: {
      interact: () => void
      moveTo: (x: number, y: number) => void
      pos: () => { x: number; y: number }
      spawn: (id: string) => void
      guests?: () => { name: string; state: string; x: number; y: number; patience: number; recipe: string }[]
      dump: () => unknown
    }
  }
}
