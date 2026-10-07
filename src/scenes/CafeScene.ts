import Phaser from 'phaser'
import { balance, phaseNames, scaleNames } from '../data/balance'
import { dialogues } from '../data/dialogues'
import { planFor } from '../data/days'
import { recipes } from '../data/recipes'
import { pickVisitorId } from '../data/visitors'
import { audio } from '../game/audio'
import { spots, WORLD, playerStart } from '../game/layout'
import { saveGame } from '../game/save'
import { game } from '../game/session'
import { distortText } from '../game/textfx'
import { endingText } from '../game/endings'
import type { ActionId, DayReport } from '../game/types'
import { ui, type HudModel } from '../ui/overlay'
import { CustomerManager } from './CustomerManager'
import { addBlockers, drawCafe } from './drawCafe'

type Spot = { x: number; y: number; label: string; use: () => void }

export class CafeScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private customers!: CustomerManager
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private moveTarget: { x: number; y: number } | null = null
  private night!: Phaser.GameObjects.Rectangle
  private marker!: Phaser.GameObjects.Text
  private ghost!: Phaser.GameObjects.Image
  private figure!: Phaser.GameObjects.Image
  private rain!: Phaser.GameObjects.Particles.ParticleEmitter
  private nina!: Phaser.GameObjects.Image
  private trail: { x: number; y: number; flip: boolean }[] = []
  private trailAcc = 0
  private footAcc = 0
  private audioAcc = 0
  private onKey = (event: KeyboardEvent) => this.handleKey(event)

  constructor() {
    super('cafe')
  }

  create(): void {
    this.customers = new CustomerManager(this)
    this.player = this.physics.add.sprite(playerStart.x, playerStart.y, 'hero')
    this.player.setCollideWorldBounds(true)
    this.player.setSize(18, 14).setOffset(15, 54)
    this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h)
    drawCafe(this)
    addBlockers(this, this.player)
    this.nina = this.add.image(spots.nina.x, spots.nina.y, 'nina').setDepth(spots.nina.y)
    this.add
      .text(spots.nina.x, spots.nina.y - 46, 'Нина', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#2a211c',
        backgroundColor: '#f4eadcc0',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(8)
    this.night = this.add.rectangle(WORLD.w / 2, WORLD.h / 2, WORLD.w, WORLD.h, 0x1a2744, 0).setDepth(9)
    this.figure = this.add.image(250, 46, 'figure').setDepth(15).setVisible(false).setAlpha(0.75)
    this.ghost = this.add.image(playerStart.x, playerStart.y, 'hero').setAlpha(0.18).setDepth(8).setVisible(false)
    this.marker = this.add
      .text(0, 0, 'E', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#fff8ee',
        backgroundColor: '#3c2418cc',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(1000)
      .setVisible(false)
    this.rain = this.add.particles(0, 0, 'soft', {
      x: { min: 20, max: WORLD.w - 20 },
      y: { min: 0, max: 6 },
      lifespan: 420,
      speedY: { min: 160, max: 240 },
      speedX: { min: -30, max: 10 },
      scale: { start: 0.18, end: 0.04 },
      alpha: { start: 0.45, end: 0 },
      frequency: 40,
      quantity: 2,
      emitting: false,
    })
    this.rain.setDepth(40)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h)
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (game.mode !== 'play') return
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      this.moveTarget = { x: world.x, y: world.y }
    })
    window.addEventListener('keydown', this.onKey)
    this.events.once('shutdown', () => window.removeEventListener('keydown', this.onKey))
    ui.bindCafe({
      interact: () => this.tryInteract(),
      breath: () => this.doAction('breath'),
      notebook: () => this.openNotebook(),
      lights: () => this.doAction('lights'),
      speed: (value) => {
        game.speed = value
      },
      skip: () => {
        game.log(game.skipWait())
      },
      dev: (kind) => this.resolve(game.debugResolve(kind)),
      devDay: (day) => {
        game.day = day
        game.prepareMorning(false)
        game.shiftLocked = false
        game.lastReport = null
        this.customers.clear()
        ui.close()
        const intro = planFor(day).intro
        if (intro && game.introPending) {
          game.mode = 'modal'
          ui.showIntro(intro, () => {
            game.dismissIntro()
            ui.close()
          })
        } else game.mode = 'play'
      },
      devPhase: (minute) => {
        game.minute = minute
        game.phase = minute >= 21 * 60 ? 'night' : minute >= 17 * 60 ? 'evening' : minute >= 12 * 60 ? 'day' : 'morning'
      },
      devScales: (fear, depression, social, fatigue) => {
        game.fear = fear
        game.depression = depression
        game.social = social
        game.fatigue = fatigue
        game.log('Шкалы изменены режимом проверки.')
      },
      devSpawn: (id) => {
        this.customers.spawn(id)
      },
      menu: () => this.toMenu(),
      resume: () => {
        if (!game.completedEnding && !game.shiftLocked) game.mode = 'play'
      },
    })
    window.__cup = {
      interact: () => this.tryInteract(),
      moveTo: (x, y) => {
        this.player.setPosition(x, y)
        this.moveTarget = null
      },
      pos: () => ({ x: this.player.x, y: this.player.y }),
      spawn: (id) => {
        this.customers.spawn(id)
      },
      guests: () =>
        this.customers.list.map((agent) => ({
          name: agent.def.name,
          state: agent.state,
          x: Math.round(agent.sprite.x),
          y: Math.round(agent.sprite.y),
          patience: Math.round(agent.patience),
          recipe: agent.recipeId,
        })),
      dump: () => ({
        day: game.day,
        phase: game.phase,
        minute: game.minute,
        fear: game.fear,
        order: game.order,
        waiting: game.waitingCustomers,
        ending: game.completedEnding,
        stage: game.visualStage(),
        mode: game.mode,
      }),
    }
    if (game.introPending) {
      const intro = planFor(game.day).intro
      if (intro) {
        game.mode = 'modal'
        ui.showIntro(intro, () => {
          game.dismissIntro()
          ui.close()
        })
      } else game.dismissIntro()
    } else {
      game.mode = 'play'
    }
    ui.enterPlay()
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000)
    const frozen = game.mode !== 'play'
    if (!frozen) {
      this.move(dt)
      const tick = game.tick(dt)
      this.customers.update(dt, tick.minutes, false)
      if (tick.signal === 'crisis') this.resolve(game.triggerCrisis())
      else if (tick.signal === 'dayend') this.resolve(game.finishShift(false))
      else if (game.shouldSpawn()) {
        const id = pickVisitorId({
          day: game.day,
          phase: game.phase,
          forced: game.takeForced(),
          rng: Math.random,
        })
        if (id) this.customers.spawn(id)
        else game.spawnAcc = 0
      }
    } else {
      this.player.setVelocity(0)
      this.customers.update(dt, 0, true)
    }
    this.player.setDepth(this.player.y)
    this.nina.setDepth(this.nina.y)
    const moving = Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y) > 10
    this.player.setFlipX(this.player.body.velocity.x < -5)
    this.player.setScale(1, moving ? 1 + Math.sin(this.time.now / 90) * 0.04 : 1)
    this.footAcc += dt
    if (moving && this.footAcc > 0.38) {
      this.footAcc = 0
      audio.foot(false)
    }
    this.trailAcc += dt
    if (this.trailAcc > 0.09) {
      this.trailAcc = 0
      this.trail.push({ x: this.player.x, y: this.player.y, flip: this.player.flipX })
      if (this.trail.length > 10) this.trail.shift()
    }
    const stage = game.visualStage()
    const showGhost = stage >= 1 && !game.settings.reduceDistortion
    this.ghost.setVisible(showGhost)
    const delayed = this.trail[0]
    if (delayed && showGhost) {
      this.ghost.setPosition(delayed.x, delayed.y)
      this.ghost.setFlipX(delayed.flip)
      this.ghost.setAlpha(stage >= 2 ? 0.28 : 0.16)
    }
    this.figure.setVisible(game.figureVisible && stage >= 1 && !game.settings.reduceDistortion)
    const nightAlpha = game.phase === 'night' ? (game.lightsOn ? 0.28 : 0.48) : game.phase === 'evening' ? 0.16 : game.phase === 'day' ? 0.04 : 0
    this.night.setAlpha(nightAlpha)
    this.rain.emitting = game.phase === 'night' || game.phase === 'evening'
    this.audioAcc += dt
    if (this.audioAcc > 0.25) {
      this.audioAcc = 0
      audio.setRoom(game.phase === 'night' || game.phase === 'evening', game.fridgeHum || game.phase === 'night', game.footstepsOn && stage >= 2)
    }
    const spot = frozen ? null : this.currentSpot()
    this.marker.setVisible(Boolean(spot))
    if (spot) this.marker.setPosition(spot.x, spot.y - 28)
    ui.sync(this.hud(spot?.label ?? 'Рядом никого', Boolean(spot)))
  }

  private move(dt: number): void {
    const left = this.keys.A?.isDown || this.keys.LEFT?.isDown
    const right = this.keys.D?.isDown || this.keys.RIGHT?.isDown
    const up = this.keys.W?.isDown || this.keys.UP?.isDown
    const down = this.keys.S?.isDown || this.keys.DOWN?.isDown
    let vx = 0
    let vy = 0
    if (left) vx -= 1
    if (right) vx += 1
    if (up) vy -= 1
    if (down) vy += 1
    const speed = 175
    if (vx || vy) {
      this.moveTarget = null
      const len = Math.hypot(vx, vy)
      this.player.setVelocity((vx / len) * speed, (vy / len) * speed)
      return
    }
    if (this.moveTarget) {
      const dx = this.moveTarget.x - this.player.x
      const dy = this.moveTarget.y - this.player.y
      const dist = Math.hypot(dx, dy)
      if (dist < 8) {
        this.moveTarget = null
        this.player.setVelocity(0)
      } else {
        this.player.setVelocity((dx / dist) * speed, (dy / dist) * speed)
      }
      void dt
      return
    }
    this.player.setVelocity(0)
  }

  private currentSpot(): Spot | null {
    const spotsNow = this.spots()
    let best: Spot | null = null
    let dist = 78
    for (const spot of spotsNow) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.x, spot.y)
      if (d < dist) {
        dist = d
        best = spot
      }
    }
    const guest = this.customers.nearest(this.player.x, this.player.y)
    if (guest) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, guest.sprite.x, guest.sprite.y)
      if (!best || d < dist) {
        return {
          x: guest.sprite.x,
          y: guest.sprite.y,
          label: this.guestLabel(guest.uid, guest.state),
          use: () => this.useGuest(guest.uid),
        }
      }
    }
    return best
  }

  private guestLabel(uid: number, state: string): string {
    if (game.order?.brewed && game.order.uid === uid) return 'Отдать напиток'
    if (state === 'waitDrink') return 'Заказ ещё готовится'
    return 'Принять заказ'
  }

  private spots(): Spot[] {
    return [
      {
        x: spots.machine.x,
        y: spots.machine.y,
        label: game.fridgeHum && !game.order ? 'Проверить холодильник' : 'Готовить напиток',
        use: () => this.useMachine(),
      },
      { x: spots.sink.x, y: spots.sink.y, label: game.stationDirty ? 'Убрать стойку' : 'Мойка', use: () => game.log(game.cleanStation()) },
      {
        x: spots.storage.x,
        y: spots.storage.y,
        label: 'Перерыв в подсобке',
        use: () => this.confirmAction('shortBreak', 'Подсобка', 'Двадцать минут тишины. Нина присмотрит за теми, кто уже ждёт. Это нельзя повторять без конца.'),
      },
      {
        x: spots.nina.x,
        y: spots.nina.y,
        label: 'Поговорить с Ниной',
        use: () =>
          this.confirmAction(
            'colleague',
            'Нина',
            'Можно попросить её проверить зал или просто постоять рядом. Это помощь, а не провал смены.',
          ),
      },
      { x: spots.light.x, y: spots.light.y, label: game.lightsOn ? 'Приглушить свет' : 'Включить свет', use: () => this.doAction('lights') },
      { x: spots.window.x, y: spots.window.y, label: 'Посмотреть в окно', use: () => game.log(game.checkWindow()) },
      {
        x: spots.food.x,
        y: spots.food.y,
        label: 'Вода и еда',
        use: () => this.openCare(),
      },
      {
        x: spots.bed.x,
        y: spots.bed.y,
        label: 'Завершить смену',
        use: () => this.sleep(),
      },
      { x: spots.notebook.x, y: spots.notebook.y, label: 'Открыть блокнот', use: () => this.openNotebook() },
    ]
  }

  private tryInteract(): void {
    if (game.mode !== 'play' || game.completedEnding) return
    const spot = this.currentSpot()
    if (!spot) {
      game.log('Подойди ближе к человеку или к стойке.')
      return
    }
    audio.blip()
    spot.use()
  }

  private useGuest(uid: number): void {
    const agent = this.customers.byUid(uid)
    if (!agent || agent.state === 'walk' || agent.state === 'leave') return
    if (game.order && !game.order.served && game.order.uid !== uid) {
      game.log('Сначала закончи текущий заказ.')
      return
    }
    if (agent.state === 'waitDrink' || (game.order && game.order.uid === uid)) {
      if (game.order?.brewed && game.order.uid === uid) {
        const result = game.tryServe(uid)
        game.log(result.message)
        if (result.ok) {
          audio.clink()
          this.customers.depart(agent)
        }
      } else game.log('Напиток ещё не готов. Кофемашина справа, за перегородкой.')
      return
    }
    const talk = dialogues[agent.def.dialogue]
    if (!talk) return
    const opened = game.openOrder(uid, agent.def.id, agent.recipeId)
    agent.state = 'talk'
    game.mode = 'modal'
    ui.showTalk(agent.def.name, agent.def.kind, talk.opening(opened.drink), talk.choices, (index) => {
      const choice = talk.choices[index]
      if (!choice) return
      game.applyChoice(choice)
      agent.patience = Math.max(agent.patience, 80)
      agent.state = 'waitDrink'
      ui.showReply(agent.def.name, choice.reply, choice.nina, () => {
        game.mode = 'play'
        ui.close()
      })
    })
  }

  private useMachine(): void {
    if (game.fridgeHum && !game.order) {
      const text = game.checkFridge()
      if (text) game.log(text)
      return
    }
    if (!game.order) {
      game.log('Сначала прими заказ у посетителя.')
      return
    }
    if (game.order.brewed) {
      game.log('Напиток уже собран. Отнеси его.')
      return
    }
    game.mode = 'modal'
    const recipe = recipes[game.order.recipeId]
    ui.showBrew({
      title: recipe.name,
      brew: recipe.brew,
      fridge: game.fridgeHum,
      ticket: () => {
        const stage = game.visualStage()
        const raw = `${recipe.name} — ${game.order?.customerName ?? ''}`
        if (stage >= 2 && !game.settings.reduceDistortion) return distortText(raw, this.time.now)
        return raw
      },
      truth: `${recipe.name}. Чашка: ${recipeLabel(recipe.cup)}. Состав: ${recipe.steps.map(stepName).join(' → ')}.`,
      onCup: (id) => this.brew('cup', id),
      onIng: (id) => this.brew('ing', id),
      onCook: () => this.brew('cook'),
      onUndo: () => this.brew('undo'),
      onClose: () => {
        game.mode = 'play'
        ui.close()
      },
      onFridge: () => {
        const text = game.checkFridge()
        if (text) game.log(text)
      },
    })
  }

  private brew(kind: 'cup' | 'ing' | 'cook' | 'undo', id = ''): void {
    const result = game.brew(kind, id)
    ui.setBrewMessage(result.message)
    if (result.done) {
      audio.clink()
      game.mode = 'play'
      ui.close()
      game.log(result.message)
    }
  }

  private openNotebook(): void {
    const order = game.order
    const truth = order
      ? `${recipes[order.recipeId].name} для ${order.customerName}. Это настоящий заказ, даже если чек плывёт.`
      : 'Открытого заказа нет. Блокнот пуст — и это тоже ответ.'
    const strained = game.visualStage() > 0 || game.uncannyOn || game.figureVisible || game.footstepsOn
    const extra =
      strained && game.canUse('notebook').ok
        ? game.useAction('notebook').message
        : strained
          ? 'Прочитать можно всегда. Снова опереться на это, чтобы отпустить страх, пока рано.'
          : 'Чек и блокнот сейчас говорят одно и то же.'
    game.mode = 'modal'
    ui.showNote('Блокнот', `${extra}\n\n${truth}`, () => {
      game.mode = 'play'
      ui.close()
    })
  }

  private doAction(id: ActionId): void {
    const result = game.useAction(id)
    game.log(result.message)
    if (result.ok && id === 'colleague') game.clearEvent('Нина посмотрела зал вместе с тобой', 0)
    if (result.ok && result.cover) {
      const count = this.customers.coverAll()
      if (count > 0) {
        game.money += count * 70
        game.earnedToday += count * 70
        game.addScale('depression', balance.cover.depression, 'заказы ушли Нине, не тебе')
        game.log(`Нина отпустила ${count} чел. Часть выручки легла в кассу, разговоры — нет.`)
      }
    }
    if (result.ok && result.minutes > 0) this.customers.update(0, result.minutes, false)
  }

  private confirmAction(id: ActionId, title: string, text: string): void {
    const check = game.canUse(id)
    game.mode = 'modal'
    ui.showNote(
      title,
      check.ok ? text : check.why,
      () => {
        game.mode = 'play'
        ui.close()
        if (check.ok) this.doAction(id)
      },
      check.ok ? 'Сделать паузу' : 'Понятно',
    )
  }

  private openCare(): void {
    game.mode = 'modal'
    ui.showCare(
      () => {
        game.mode = 'play'
        ui.close()
        this.doAction('water')
      },
      () => {
        game.mode = 'play'
        ui.close()
        this.doAction('food')
      },
      () => {
        game.mode = 'play'
        ui.close()
      },
    )
  }

  private sleep(): void {
    const early = game.minute < balance.time.eveningMinute
    game.mode = 'modal'
    ui.showNote(
      'Закрыть смену',
      early
        ? 'До вечера ещё далеко. Уйти можно: день получится коротким, а совсем без заказов наутро будет тяжелее. Сон поможет, но не обнулит состояние.'
        : 'Нина закроет кассу. Сон снимет часть усталости и не сотрёт день до нуля.',
      () => {
        ui.close()
        this.resolve(game.finishShift(true))
      },
      'Поспать',
    )
  }

  private resolve(report: DayReport): void {
    this.customers.clear()
    this.player.setVelocity(0)
    saveGame()
    ui.showReport(report, () => {
      if (report.ending) {
        ui.showEnding(report.ending, endingText[report.ending].title, endingText[report.ending].body, () => this.toMenu())
        return
      }
      if (game.introPending) {
        const intro = planFor(game.day).intro
        if (intro) {
          ui.showIntro(intro, () => {
            game.dismissIntro()
            ui.close()
          })
          return
        }
      }
      game.beginMorningPlay()
      ui.close()
    })
  }

  private toMenu(): void {
    ui.close()
    this.scene.start('boot')
  }

  private hud(prompt: string, enabled: boolean): HudModel {
    const stage = game.visualStage()
    const order = game.order
    let orderText = 'Нет активного заказа'
    let note = ''
    if (order && !order.served) {
      const clean = `${recipes[order.recipeId].name} — ${order.customerName}`
      orderText = stage >= 2 && !game.settings.reduceDistortion ? distortText(clean, this.time.now) : clean
      if (stage >= 2) note = game.settings.reduceDistortion ? 'Чек плывёт. Открой блокнот: там настоящий заказ.' : 'Строка на чеке дрожит. Блокнот не врёт.'
      if (order.brewed) note = 'Напиток готов, его нужно отнести.'
    }
    return {
      day: game.day,
      phase: phaseNames[game.phase],
      clock: game.clock(),
      money: game.money,
      scales: game.scales(),
      crisis: game.crisisLine(),
      order: orderText,
      orderNote: note,
      logs: game.logs.map((line) => line.text),
      prompt: enabled ? `E — ${prompt}` : 'Подойди ближе',
      promptEnabled: enabled && game.mode === 'play',
      objective: game.objective(),
      speed: game.speed,
      speedLocked: game.waitingCustomers > 0,
      stage,
      lightLabel: game.lightsOn ? 'Свет включён' : 'Свет приглушён',
      names: scaleNames,
    }
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.code === 'F2') {
      ui.toggleDev()
      return
    }
    if (event.code === 'Escape') {
      event.preventDefault()
      if (ui.kind() === 'brew' || ui.kind() === 'note' || ui.kind() === 'care') {
        game.mode = 'play'
        ui.close()
        return
      }
      if (ui.kind() === 'pause') {
        game.mode = 'play'
        ui.close()
        return
      }
      if (ui.kind() === 'talk' || ui.kind() === 'intro' || ui.kind() === 'report' || ui.kind() === 'ending' || ui.kind() === 'reply') return
      if (game.mode === 'play') {
        game.mode = 'modal'
        ui.showPause()
      }
      return
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault()
    if (event.code === 'KeyE') this.tryInteract()
  }
}

function recipeLabel(cup: string): string {
  const names: Record<string, string> = {
    demitasse: 'маленькая для эспрессо',
    mug: 'большая',
    wide: 'широкая для капучино',
    tea: 'чайная',
  }
  return names[cup] ?? cup
}

function stepName(id: string): string {
  const names: Record<string, string> = {
    espresso: 'эспрессо',
    water: 'горячая вода',
    milk: 'молоко',
    tea: 'чай',
    steam: 'пар',
  }
  return names[id] ?? id
}
