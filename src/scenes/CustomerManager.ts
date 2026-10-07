import Phaser from 'phaser'
import { queues, seats, spawnPoint } from '../game/layout'
import { game } from '../game/session'
import { pickRecipe, visitorById, type VisitorDef } from '../data/visitors'
import type { RecipeId } from '../game/types'

export interface Agent {
  uid: number
  def: VisitorDef
  recipeId: RecipeId
  state: 'walk' | 'wait' | 'talk' | 'waitDrink' | 'leave'
  patience: number
  path: { x: number; y: number }[]
  index: number
  sits: boolean
  spot: { x: number; y: number }
  sprite: Phaser.GameObjects.Image
  label: Phaser.GameObjects.Text
  bar: Phaser.GameObjects.Graphics
}

export class CustomerManager {
  readonly list: Agent[] = []
  private occupiedQueues = new Set<number>()
  private occupiedSeats = new Set<number>()

  constructor(private scene: Phaser.Scene) {}

  spawn(defId: string): Agent | null {
    const def = visitorById(defId)
    const sits = def.sits && this.freeSeat() >= 0 && Math.random() < 0.55
    const spotIndex = sits ? this.freeSeat() : this.freeQueue()
    if (spotIndex < 0) return null
    const spot = sits ? seats[spotIndex]! : queues[spotIndex]!
    if (sits) this.occupiedSeats.add(spotIndex)
    else this.occupiedQueues.add(spotIndex)
    const uid = game.nextUid++
    const recipeId = pickRecipe(def, Math.random)
    const sprite = this.scene.add.image(spawnPoint.x, spawnPoint.y, this.texture(def)).setDepth(spawnPoint.y)
    const label = this.scene.add
      .text(spawnPoint.x, spawnPoint.y - 46, def.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#2a211c',
        backgroundColor: '#f4eadcc0',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(900)
    const bar = this.scene.add.graphics().setDepth(901)
    const agent: Agent = {
      uid,
      def,
      recipeId,
      state: 'walk',
      patience: def.patience,
      path: sits
        ? [spawnPoint, { x: 90, y: 780 }, { x: 90, y: spot.y }, spot]
        : [spawnPoint, { x: 720, y: 760 }, spot],
      index: 0,
      sits,
      spot,
      sprite,
      label,
      bar,
    }
    this.list.push(agent)
    game.noteSpawn()
    return agent
  }

  private texture(def: VisitorDef): string {
    if (game.uncannyOn && def.canUncanny && this.scene.textures.exists(`v-${def.id}-alt`)) return `v-${def.id}-alt`
    return `v-${def.id}`
  }

  private freeQueue(): number {
    for (let i = 0; i < queues.length; i++) if (!this.occupiedQueues.has(i)) return i
    return -1
  }

  private freeSeat(): number {
    for (let i = 0; i < seats.length; i++) if (!this.occupiedSeats.has(i)) return i
    return -1
  }

  nearest(x: number, y: number): Agent | null {
    let best: Agent | null = null
    let dist = 74
    for (const agent of this.list) {
      if (agent.state === 'leave' || agent.state === 'walk') continue
      const d = Phaser.Math.Distance.Between(x, y, agent.sprite.x, agent.sprite.y)
      if (d < dist) {
        dist = d
        best = agent
      }
    }
    return best
  }

  update(dt: number, minutes: number, frozen: boolean): void {
    game.waitingCustomers = this.list.filter((agent) => agent.state !== 'leave').length
    for (const agent of [...this.list]) {
      const key = this.texture(agent.def)
      if (agent.sprite.texture.key !== key) agent.sprite.setTexture(key)
      if (!frozen && (agent.state === 'walk' || agent.state === 'leave')) this.follow(agent, dt)
      if (!frozen && (agent.state === 'wait' || agent.state === 'waitDrink')) {
        agent.patience -= agent.def.drain * minutes
        if (agent.patience <= 0) this.abandon(agent)
      }
      agent.sprite.setDepth(agent.sprite.y)
      agent.label.setPosition(agent.sprite.x, agent.sprite.y - 48)
      this.drawBar(agent)
      const bob = agent.state === 'walk' || agent.state === 'leave' ? Math.sin(this.scene.time.now / 120) * 0.03 : 0
      agent.sprite.setScale(1, 1 + bob)
    }
  }

  private follow(agent: Agent, dt: number): void {
    const target = agent.path[agent.index]
    if (!target) {
      if (agent.state === 'leave') this.remove(agent)
      else agent.state = 'wait'
      return
    }
    const dx = target.x - agent.sprite.x
    const dy = target.y - agent.sprite.y
    const dist = Math.hypot(dx, dy)
    if (dist < 6) {
      agent.index += 1
      if (agent.index >= agent.path.length) {
        if (agent.state === 'leave') this.remove(agent)
        else agent.state = 'wait'
      }
      return
    }
    const step = Math.min(dist, 96 * dt)
    agent.sprite.x += (dx / dist) * step
    agent.sprite.y += (dy / dist) * step
    agent.sprite.setFlipX(dx < 0)
  }

  private drawBar(agent: Agent): void {
    agent.bar.clear()
    if (agent.state === 'leave' || agent.state === 'walk') return
    const p = Phaser.Math.Clamp(agent.patience / agent.def.patience, 0, 1)
    const color = p > 0.5 ? 0x6a8f5b : p > 0.25 ? 0xc48a3a : 0xa34444
    agent.bar.fillStyle(0x000000, 0.35)
    agent.bar.fillRect(agent.sprite.x - 16, agent.sprite.y - 40, 32, 4)
    agent.bar.fillStyle(color, 1)
    agent.bar.fillRect(agent.sprite.x - 16, agent.sprite.y - 40, 32 * p, 4)
  }

  private abandon(agent: Agent): void {
    game.customerLeft(agent.uid)
    this.depart(agent)
  }

  depart(agent: Agent): void {
    if (agent.state === 'leave') return
    agent.state = 'leave'
    this.freeSpot(agent)
    agent.path = [
      { x: agent.sprite.x, y: agent.sprite.y },
      { x: 560, y: 760 },
      spawnPoint,
    ]
    agent.index = 0
  }

  coverAll(): number {
    const waiting = this.list.filter((agent) => agent.state !== 'leave')
    for (const agent of waiting) {
      if (game.order && game.order.uid === agent.uid && !game.order.paid) game.order = null
      this.depart(agent)
    }
    return waiting.length
  }

  private freeSpot(agent: Agent): void {
    const pool = agent.sits ? seats : queues
    const occ = agent.sits ? this.occupiedSeats : this.occupiedQueues
    const idx = pool.findIndex((spot) => spot.x === agent.spot.x && spot.y === agent.spot.y)
    if (idx >= 0) occ.delete(idx)
  }

  private remove(agent: Agent): void {
    agent.sprite.destroy()
    agent.label.destroy()
    agent.bar.destroy()
    const i = this.list.indexOf(agent)
    if (i >= 0) this.list.splice(i, 1)
  }

  clear(): void {
    for (const agent of [...this.list]) this.remove(agent)
    this.occupiedQueues.clear()
    this.occupiedSeats.clear()
    game.waitingCustomers = 0
  }

  byUid(uid: number): Agent | undefined {
    return this.list.find((agent) => agent.uid === uid)
  }
}
