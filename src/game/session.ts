import { balance, formatClock, phaseOf, scaleNames } from '../data/balance'
import { achievementFor, planFor } from '../data/days'
import { dialogues, type Choice } from '../data/dialogues'
import { eventById, events } from '../data/events'
import { recipes } from '../data/recipes'
import { drinkOf, pickRecipe, visitorById } from '../data/visitors'
import { inCrisisBand, visualStage } from './distort'
import { evaluateEnding, type EndingInput } from './endings'
import { brewClick } from './orders'
import type { ActionId, DayReport, EndingId, HistoryDay, Order, Phase, RecipeId, ScaleKey } from './types'

export interface LogLine {
  id: number
  text: string
}

export interface ActionResult {
  ok: boolean
  message: string
  minutes: number
  cover: boolean
}

const clamp = (v: number, a = 0, b = balance.scalesMax) => Math.max(a, Math.min(b, v))

export class Session {
  day = 1
  minute = balance.time.startMinute
  phase: Phase = 'morning'
  money = 0
  fear = balance.start.fear
  depression = balance.start.depression
  social = balance.start.social
  fatigue = balance.start.fatigue
  resilience = 0
  supportUses = 0
  restDays = 0
  totalServed = 0
  history: HistoryDay[] = []
  completedEnding: EndingId | null = null

  servedToday = 0
  mistakesToday = 0
  leftToday = 0
  earnedToday = 0
  usedRestore = false
  supportToday = false
  boundaryToday = false
  workedNight = false
  uses: Partial<Record<ActionId, number>> = {}
  readyAt: Partial<Record<ActionId, number>> = {}
  restNames: string[] = []

  order: Order | null = null
  nextUid = 1
  spawnedToday = 0
  spawnAcc = 0
  forcedSpawn: string | null = 'sonya'
  waitingCustomers = 0
  speed = 1
  mode: 'play' | 'modal' = 'modal'
  lightsOn = true
  stationDirty = false
  dirtyPenalized = false

  logs: LogLine[] = []
  private logSeq = 1
  dawn = { fear: 32, depression: 46, social: 54, fatigue: 26 }
  peak = { fear: 32, depression: 46, social: 54 }
  endNotes: string[] = []

  activeEventId: string | null = null
  eventCounts: Record<string, number> = {}
  eventCooldownUntil = 0
  figureVisible = false
  footstepsOn = false
  uncannyOn = false
  fridgeHum = false
  suppressUntil = 0
  crisisMeter = 0
  lastHelpMinute = balance.time.startMinute
  crisisMarks = 0
  shiftLocked = false
  dayEndQueued = false
  introPending = true
  lastReport: DayReport | null = null
  private darkFearAcc = 0
  private lastPhase: Phase = 'morning'

  settings = {
    sfx: 0.7,
    ambient: 0.45,
    reduceFlicker: false,
    reduceDistortion: false,
    dev: false,
  }

  resetNew(): void {
    const fresh = new Session()
    fresh.settings = { ...this.settings, dev: this.settings.dev }
    Object.assign(this, fresh)
    this.logs = []
    this.history = []
    this.uses = {}
    this.readyAt = {}
    this.restNames = []
    this.eventCounts = {}
    this.endNotes = []
    this.prepareMorning(true)
  }

  prepareMorning(first = false): void {
    const plan = planFor(this.day)
    this.minute = balance.time.startMinute
    this.phase = 'morning'
    this.lastPhase = 'morning'
    this.workedNight = false
    this.shiftLocked = false
    this.dayEndQueued = false
    this.servedToday = 0
    this.mistakesToday = 0
    this.leftToday = 0
    this.earnedToday = 0
    this.usedRestore = false
    this.supportToday = false
    this.boundaryToday = false
    this.uses = {}
    this.readyAt = {}
    this.restNames = []
    this.order = null
    this.spawnedToday = 0
    this.spawnAcc = Math.max(0, plan.spawnMinutes - 12)
    this.forcedSpawn = plan.firstId
    this.stationDirty = false
    this.dirtyPenalized = false
    this.activeEventId = null
    this.figureVisible = false
    this.footstepsOn = false
    this.uncannyOn = false
    this.fridgeHum = false
    this.eventCounts = {}
    this.eventCooldownUntil = 0
    this.suppressUntil = 0
    this.crisisMeter = 0
    this.crisisMarks = 0
    this.lastHelpMinute = this.minute
    this.lightsOn = true
    this.endNotes = []
    this.darkFearAcc = 0
    this.dawn = this.scales()
    this.peak = { fear: this.fear, depression: this.depression, social: this.social }
    this.introPending = Boolean(plan.intro)
    this.mode = this.introPending ? 'modal' : 'play'
    if (first) this.log('Смена открыта. Можно не спешить.')
  }

  scales(): Record<ScaleKey, number> {
    return {
      fear: this.fear,
      depression: this.depression,
      social: this.social,
      fatigue: this.fatigue,
    }
  }

  log(text: string): void {
    this.logs.unshift({ id: this.logSeq++, text })
    this.logs = this.logs.slice(0, 6)
  }

  private touchPeak(): void {
    this.peak.fear = Math.max(this.peak.fear, this.fear)
    this.peak.depression = Math.max(this.peak.depression, this.depression)
    this.peak.social = Math.max(this.peak.social, this.social)
  }

  apply(key: ScaleKey, delta: number): number {
    const before = this[key]
    this[key] = clamp(before + delta)
    this.touchPeak()
    return this[key] - before
  }

  addScale(key: ScaleKey, delta: number, reason: string): void {
    const applied = this.apply(key, delta)
    const shown = Math.round(applied)
    if (shown === 0 || !reason) return
    this.log(`${scaleNames[key]} ${shown > 0 ? '+' : ''}${shown}: ${reason}`)
  }

  addSocial(delta: number, reason: string): void {
    if (delta > 0) {
      const mul = Math.max(balance.socialMulFloor, 1 - this.resilience * balance.resilienceStep)
      this.addScale('social', delta * mul, reason)
      return
    }
    this.addScale('social', delta, reason)
  }

  addResilience(amount: number): void {
    this.resilience = clamp(this.resilience + amount, 0, balance.resilienceCap)
  }

  visualStage(): 0 | 1 | 2 | 3 {
    return visualStage(
      {
        day: this.day,
        fear: this.fear,
        depression: this.depression,
        fatigue: this.fatigue,
        minute: this.minute,
        suppressUntil: this.suppressUntil,
      },
      this.settings.reduceDistortion,
    )
  }

  markHelp(): void {
    this.lastHelpMinute = this.minute
    this.crisisMeter *= balance.crisis.meterKeep
    this.supportUses += 1
    this.supportToday = true
  }

  clearEvent(reason: string, fearRelief: number): void {
    if (!this.activeEventId && !this.figureVisible && !this.uncannyOn && !this.footstepsOn && !this.fridgeHum) {
      if (fearRelief > 0) this.addScale('fear', -Math.min(2, fearRelief), reason)
      return
    }
    this.activeEventId = null
    this.figureVisible = false
    this.footstepsOn = false
    this.uncannyOn = false
    this.fridgeHum = false
    this.eventCooldownUntil = this.minute + 70
    if (fearRelief !== 0) this.addScale('fear', -Math.abs(fearRelief), reason)
  }

  private rollEvents(minutes: number): void {
    if (this.activeEventId) return
    if (this.minute < this.eventCooldownUntil) return
    if (minutes <= 0) return
    const chanceWindow = minutes / 30
    if (Math.random() > Math.min(1, chanceWindow)) return
    const stage = this.visualStage()
    const options = events.filter((event) => {
      if (this.day < event.minDay) return false
      if (!event.phases.includes(this.phase)) return false
      if (stage < event.minStage) return false
      if ((this.eventCounts[event.id] ?? 0) >= event.perDay) return false
      return Math.random() < event.chance
    })
    const pick = options[0]
    if (!pick) return
    this.eventCounts[pick.id] = (this.eventCounts[pick.id] ?? 0) + 1
    this.activeEventId = pick.id
    this.eventCooldownUntil = this.minute + 50
    if (pick.kind === 'figure') this.figureVisible = true
    if (pick.kind === 'steps') this.footstepsOn = true
    if (pick.kind === 'uncanny') this.uncannyOn = true
    if (pick.kind === 'fridge') this.fridgeHum = true
    this.addScale('fear', pick.fear, pick.reason)
    this.log(pick.text)
  }

  private advanceCrisis(minutes: number): 'crisis' | null {
    if (this.completedEnding || this.day < balance.crisis.minDay) return null
    const hot = inCrisisBand(this.fear, this.depression, this.social, this.fatigue, this.day)
    if (!hot) {
      this.crisisMeter = Math.max(0, this.crisisMeter - minutes * 1.5)
      this.crisisMarks = 0
      return null
    }
    const sinceHelp = this.minute - this.lastHelpMinute
    if (sinceHelp < balance.crisis.helpMemoryMinutes) {
      this.crisisMeter = Math.max(0, this.crisisMeter - minutes)
      return null
    }
    this.crisisMeter += minutes
    const p = this.crisisMeter / balance.crisis.durationMinutes
    const mark = p > 0.75 ? 3 : p > 0.5 ? 2 : p > 0.25 ? 1 : 0
    if (mark > this.crisisMarks) {
      this.crisisMarks = mark
      this.log('Становится слишком тяжело. Можно остановиться: дыхание, Нина, еда, подсобка или сон.')
    }
    if (this.crisisMeter >= balance.crisis.durationMinutes) return 'crisis'
    return null
  }

  tick(realSec: number): { minutes: number; signal: 'crisis' | 'dayend' | null } {
    if (this.mode !== 'play' || this.completedEnding || this.shiftLocked) {
      return { minutes: 0, signal: null }
    }
    const speed = this.waitingCustomers > 0 ? 1 : this.speed
    const minutes = (realSec / balance.time.secondsPerGameMinute) * speed
    if (minutes <= 0) return { minutes: 0, signal: null }
    this.minute += minutes
    this.spawnAcc += minutes
    const fatigueMul = this.phase === 'night' ? balance.nightFatigueMul : this.phase === 'evening' ? 1.15 : 1
    this.apply('fatigue', balance.fatiguePerMinute * minutes * fatigueMul)
    if (!this.lightsOn && (this.phase === 'night' || this.phase === 'evening')) {
      this.darkFearAcc += balance.darkFearPerMinute * minutes
      if (this.darkFearAcc >= 5) {
        this.darkFearAcc -= 5
        this.addScale('fear', 5, 'долго в темноте и тишине')
      }
    }
    const phase = phaseOf(this.minute)
    if (phase !== this.lastPhase) {
      this.lastPhase = phase
      this.phase = phase
      if (phase === 'night') this.workedNight = true
      this.log(phaseLine(phase))
      if (this.day >= 4 && phase === 'evening' && (this.eventCounts.fridge ?? 0) === 0) {
        const fridge = eventById('fridge')
        if (fridge) {
          this.eventCounts.fridge = 1
          this.activeEventId = fridge.id
          this.fridgeHum = true
          this.addScale('fear', fridge.fear, fridge.reason)
          this.log(fridge.text)
        }
      }
    } else {
      this.phase = phase
    }
    this.rollEvents(minutes)
    const crisis = this.advanceCrisis(minutes)
    if (crisis) return { minutes, signal: 'crisis' }
    if (this.minute >= balance.time.forceEndMinute && !this.dayEndQueued) {
      this.dayEndQueued = true
      return { minutes, signal: 'dayend' }
    }
    return { minutes, signal: null }
  }

  nudge(minutes: number, fatigue = true): void {
    this.minute += minutes
    if (fatigue) this.apply('fatigue', balance.fatiguePerMinute * minutes)
    this.phase = phaseOf(this.minute)
  }

  shouldSpawn(): boolean {
    if (this.mode !== 'play' || this.completedEnding || this.shiftLocked) return false
    const plan = planFor(this.day)
    if (this.spawnedToday >= plan.spawnCap) return false
    if (this.waitingCustomers >= plan.maxWaiting) return false
    if (this.order && !this.order.served) return false
    return this.spawnAcc >= this.spawnInterval()
  }

  spawnInterval(): number {
    const plan = planFor(this.day)
    const mul = this.phase === 'night' ? 1.75 : this.phase === 'evening' ? 1.15 : this.phase === 'day' ? 0.9 : 1
    return plan.spawnMinutes * mul
  }

  takeForced(): string | null {
    const id = this.forcedSpawn
    this.forcedSpawn = null
    return id
  }

  noteSpawn(): void {
    this.spawnedToday += 1
    this.spawnAcc = 0
  }

  skipWait(): string {
    if (this.waitingCustomers > 0 || (this.order && !this.order.served)) {
      return 'Сейчас кто-то ждёт. Время не ускоряется посреди заказа.'
    }
    const jump = Math.min(25, Math.max(8, this.spawnInterval() - this.spawnAcc))
    this.nudge(jump)
    this.spawnAcc += jump
    this.log(`Прошло около ${Math.round(jump)} минут. Зал пока тихий.`)
    return 'Ожидание промотано.'
  }

  openOrder(uid: number, visitorId: string, recipeId?: RecipeId): { drink: string; recipeId: RecipeId } {
    const def = visitorById(visitorId)
    const recipe = recipeId ?? pickRecipe(def, Math.random)
    const drink = drinkOf(recipe)
    this.order = {
      uid,
      recipeId: recipe,
      customerName: def.name,
      cup: null,
      steps: [],
      brewed: false,
      served: false,
      paid: false,
      mistakes: 0,
    }
    const talk = dialogues[def.dialogue]
    if (talk?.approach) {
      const a = talk.approach
      if (a.fear) this.addScale('fear', a.fear, a.reason)
      if (a.social) this.addSocial(a.social, a.reason)
      if (a.depression) this.addScale('depression', a.depression, a.reason)
      if (a.fatigue) this.addScale('fatigue', a.fatigue, a.reason)
    }
    return { drink, recipeId: recipe }
  }

  applyChoice(choice: Choice): void {
    if (choice.fear) this.addScale('fear', choice.fear, choice.fearReason ?? 'разговор')
    if (choice.depression) this.addScale('depression', choice.depression, choice.depressionReason ?? 'разговор')
    if (choice.social) this.addSocial(choice.social, choice.socialReason ?? 'разговор')
    if (choice.fatigue) this.addScale('fatigue', choice.fatigue, choice.fatigueReason ?? 'разговор')
    if (choice.resilience) this.addResilience(choice.resilience)
    if (choice.support) this.markHelp()
    if (choice.clearEvent) this.clearEvent('ситуацию проверили вслух', 0)
    const boundary = /тише|не нужно|не буду|границ|подожд|дальше от стойки|пару фраз/i.test(choice.text)
    if (boundary) this.boundaryToday = true
  }

  brew(kind: 'cup' | 'ing' | 'cook' | 'undo', id = ''): { ok: boolean; message: string; done?: boolean } {
    if (!this.order || this.order.served) return { ok: false, message: 'Сейчас нечего готовить.' }
    if (this.stationDirty && !this.dirtyPenalized && kind !== 'undo') {
      this.dirtyPenalized = true
      this.nudge(4)
      this.addScale('fatigue', 2, 'готовка на неубранной стойке')
      this.log('Стойка ещё грязная: ушло лишнее время. После заказа её лучше вымыть.')
    }
    const result = brewClick(this.order, kind, id)
    if (result.waste) {
      this.mistakesToday += 1
      this.money = Math.max(0, this.money - balance.waste.money)
      this.nudge(balance.waste.minutes)
      this.addScale('fatigue', balance.waste.fatigue, 'пришлось переделывать шаг')
    } else if (result.ok) {
      this.nudge(balance.stepMinutes)
    }
    return result
  }

  tryServe(uid: number): { ok: boolean; message: string } {
    const order = this.order
    if (!order) return { ok: false, message: 'Нет открытого заказа.' }
    if (order.paid || order.served) return { ok: false, message: 'Этот заказ уже выдан.' }
    if (order.uid !== uid) return { ok: false, message: 'Сначала отдай напиток тому, кто его ждёт.' }
    if (!order.brewed) return { ok: false, message: 'Напиток ещё не готов.' }
    order.served = true
    order.paid = true
    const price = recipes[order.recipeId].price
    this.money += price
    this.earnedToday += price
    this.servedToday += 1
    this.totalServed += 1
    this.stationDirty = true
    this.dirtyPenalized = false
    this.addScale('fatigue', balance.serve.fatigue, 'приготовление и выдача')
    this.addScale('depression', balance.serve.depression, 'небольшой законченный заказ')
    this.order = null
    return { ok: true, message: `${recipes[order.recipeId].name} отдан. +${price} ₽` }
  }

  customerLeft(uid: number): void {
    this.leftToday += 1
    this.addScale('depression', balance.left.depression, 'гость не дождался')
    if (this.order && this.order.uid === uid && !this.order.paid) {
      this.order = null
      this.log('Заказ закрыт: человек ушёл.')
    }
  }

  cleanStation(): string {
    if (!this.stationDirty) return 'Стойка и так чистая.'
    this.stationDirty = false
    this.dirtyPenalized = false
    this.nudge(4)
    this.apply('fatigue', 1)
    this.addScale('fear', -1, 'простое дело вернуло внимание в комнату')
    return 'Стойка вымыта.'
  }

  checkWindow(): string {
    if (this.figureVisible || this.activeEventId === 'figure') {
      this.clearEvent('за окном пусто', 7)
      return 'За стеклом дождь, фонарь и никого. Силуэт не возвращается.'
    }
    this.addScale('fear', -1, 'улица выглядит обычной')
    return this.phase === 'night'
      ? 'Ночная улица мокрая и пустая. Фонарь горит ровно.'
      : 'За окном обычный день. Машины, люди, ничего лишнего.'
  }

  checkFridge(): string | null {
    if (!this.fridgeHum && this.activeEventId !== 'fridge') return null
    this.clearEvent('гул шёл от компрессора', 4)
    return 'Корпус холодильника вибрирует. Это техника. Звук становится обычным.'
  }

  canUse(id: ActionId): { ok: boolean; why: string } {
    const meta = balance.actions[id]
    const used = this.uses[id] ?? 0
    if (used >= meta.limit) return { ok: false, why: 'На сегодня этого достаточно. Повтор почти не поможет.' }
    const ready = this.readyAt[id] ?? 0
    if (this.minute < ready) {
      const left = Math.ceil(ready - this.minute)
      return { ok: false, why: `Рано повторять. Ещё около ${left} мин.` }
    }
    return { ok: true, why: '' }
  }

  useAction(id: ActionId): ActionResult {
    if (id === 'lights') return this.toggleLights()
    const check = this.canUse(id)
    if (!check.ok) return { ok: false, message: check.why, minutes: 0, cover: false }
    const meta = balance.actions[id]
    const used = this.uses[id] ?? 0
    const power = Math.pow(meta.diminish, used)
    const applyRelief = (key: ScaleKey, base?: number, reason?: string) => {
      if (!base) return
      const delta = base < 0 ? base * power : base
      this.addScale(key, delta, reason ?? 'пауза')
    }
    if (id === 'notebook') {
      const stage = this.visualStage()
      if (stage === 0 && !this.uncannyOn && !this.figureVisible) {
        this.uses.notebook = used + 1
        this.readyAt.notebook = this.minute + meta.cooldown
        this.nudge(meta.minutes, false)
        return {
          ok: true,
          message: 'В блокноте тот же заказ, что и на чеке. Сейчас всё сходится.',
          minutes: meta.minutes,
          cover: false,
        }
      }
      this.suppressUntil = this.minute + balance.distortion.suppressMinutes
      this.clearEvent('блокнот совпал с тем, что было сказано вслух', 0)
    }
    applyRelief('fear', meta.fear, actionReason(id, 'fear'))
    applyRelief('depression', meta.depression, actionReason(id, 'depression'))
    if (meta.social) this.addSocial(meta.social < 0 ? meta.social * power : meta.social, actionReason(id, 'social'))
    applyRelief('fatigue', meta.fatigue, actionReason(id, 'fatigue'))
    this.uses[id] = used + 1
    this.readyAt[id] = this.minute + meta.cooldown
    this.nudge(meta.minutes)
    this.markHelp()
    this.usedRestore = true
    if (!this.restNames.includes(actionTitle(id))) this.restNames.push(actionTitle(id))
    const cover = id === 'shortBreak'
    return { ok: true, message: actionMessage(id), minutes: meta.minutes, cover }
  }

  private toggleLights(): ActionResult {
    this.lightsOn = !this.lightsOn
    if (this.lightsOn) {
      const check = this.canUse('lights')
      if (check.ok && (this.phase === 'night' || this.phase === 'evening' || this.visualStage() > 0)) {
        this.uses.lights = (this.uses.lights ?? 0) + 1
        this.readyAt.lights = this.minute + balance.actions.lights.cooldown
        this.addScale('fear', balance.actions.lights.fear ?? -4, 'свет вернулся в зал')
        this.markHelp()
      }
      this.log('Лампы включены.')
      return { ok: true, message: 'В зале снова светло.', minutes: 0, cover: false }
    }
    if (this.phase === 'night') this.addScale('fear', 2, 'в зале стало темнее')
    this.log('Часть ламп погашена.')
    return { ok: true, message: 'Ты приглушила свет.', minutes: 0, cover: false }
  }

  private endingInput(): EndingInput {
    return {
      day: this.day,
      fear: this.fear,
      depression: this.depression,
      social: this.social,
      restDays: this.restDays,
      totalServed: this.totalServed,
      resilience: this.resilience,
      supportUses: this.supportUses,
      history: this.history,
    }
  }

  private pushHistory(): void {
    this.history.push({
      day: this.day,
      fear: this.fear,
      depression: this.depression,
      social: this.social,
      fatigue: this.fatigue,
      peakFear: this.peak.fear,
      peakDepression: this.peak.depression,
      peakSocial: this.peak.social,
    })
  }

  private endModifiers(): void {
    if (this.servedToday === 0) {
      this.addScale('depression', balance.isolation.depression, 'день почти без людей')
      this.addScale('social', balance.isolation.social, 'изоляция не снимает напряжение')
      this.endNotes.push('Заказов не было. Тишина не засчиталась как отдых.')
    } else if (this.servedToday >= balance.goalServed.min && this.servedToday <= balance.goalServed.max) {
      this.addScale('depression', balance.goalServed.depression, 'смена была посильной')
      this.endNotes.push('Объём работы был небольшим и законченным.')
    }
    if (this.servedToday >= balance.overwork.served && !this.usedRestore && this.fatigue >= balance.overwork.fatigue) {
      this.addScale('depression', balance.overwork.depression, 'длинная смена без остановки')
      this.addScale('fear', balance.overwork.fear, 'усталость делает зал громче')
      this.endNotes.push('Смена вышла слишком длинной и без паузы.')
    }
  }

  finishShift(voluntary: boolean): DayReport {
    if (this.shiftLocked && this.lastReport) return this.lastReport
    this.shiftLocked = true
    this.mode = 'modal'
    this.endModifiers()
    const before = this.scales()
    if (voluntary || this.usedRestore) this.restDays += 1
    else this.restDays += 0.5
    this.pushHistory()
    const ending = this.day >= 30 ? evaluateEnding(this.endingInput()) : null
    const report = this.makeReport(before, ending, null)
    if (ending) {
      this.completedEnding = ending
      report.ending = ending
      this.lastReport = report
      return report
    }
    const mul = this.servedToday === 0 ? balance.isolationSleepMul : 1
    this.addScale('fear', balance.sleep.fear * mul, 'сон')
    this.addScale('depression', balance.sleep.depression * mul, 'сон')
    this.addScale('social', balance.sleep.social * mul, 'сон')
    this.addScale('fatigue', balance.sleep.fatigue * mul, 'сон')
    report.afterSleep = this.scales()
    this.day += 1
    report.nextDay = this.day
    this.prepareMorning(false)
    this.shiftLocked = true
    this.mode = 'modal'
    this.lastReport = report
    return report
  }

  beginMorningPlay(): void {
    this.shiftLocked = false
    this.lastReport = null
    this.mode = this.introPending ? 'modal' : 'play'
  }

  dismissIntro(): void {
    this.introPending = false
    this.shiftLocked = false
    this.mode = 'play'
  }

  triggerCrisis(): DayReport {
    if (this.completedEnding === 'crisis' && this.lastReport) return this.lastReport
    this.shiftLocked = true
    this.mode = 'modal'
    this.completedEnding = 'crisis'
    const before = this.scales()
    this.pushHistory()
    const report = this.makeReport(before, 'crisis', null)
    this.lastReport = report
    return report
  }

  private reportSkeleton(ending: EndingId): DayReport {
    return this.makeReport(this.scales(), ending, null)
  }

  private makeReport(
    before: Record<ScaleKey, number>,
    ending: EndingId | null,
    after: Record<ScaleKey, number> | null,
  ): DayReport {
    return {
      closedDay: this.day,
      nextDay: ending ? null : this.day,
      earned: this.earnedToday,
      served: this.servedToday,
      mistakes: this.mistakesToday,
      left: this.leftToday,
      rest: [...this.restNames],
      notes: [...this.endNotes],
      achievement:
        ending === 'crisis'
          ? 'Нина закрыла кассу вместе с тобой.'
          : achievementFor({
              day: this.day,
              served: this.servedToday,
              left: this.leftToday,
              mistakes: this.mistakesToday,
              rest: this.restNames,
              support: this.supportToday,
              boundary: this.boundaryToday,
              night: this.workedNight,
              fear: before.fear,
            }),
      before,
      afterSleep: after,
      ending,
    }
  }

  /** Подставляет условия и возвращает концовку через обычные проверки. */
  debugPrepare(kind: EndingId): void {
    this.completedEnding = null
    this.shiftLocked = false
    this.lastReport = null
    this.servedToday = 4
    this.usedRestore = true
    if (kind === 'crisis') {
      this.day = Math.max(this.day, balance.crisis.minDay)
      this.fear = 92
      this.depression = 91
      this.social = 90
      this.fatigue = 88
      this.lastHelpMinute = -10000
      this.crisisMeter = balance.crisis.durationMinutes - 1
      this.peak = { fear: this.fear, depression: this.depression, social: this.social }
      return
    }
    this.day = 30
    this.totalServed = kind === 'good' ? 48 : 10
    this.resilience = kind === 'good' ? 8 : 2
    this.supportUses = kind === 'good' ? 12 : 1
    this.restDays = kind === 'good' ? 20 : 6
    this.fear = kind === 'good' ? 22 : 61
    this.depression = kind === 'good' ? 24 : 58
    this.social = kind === 'good' ? 20 : 55
    this.fatigue = 30
    this.history = [28, 29].map((day) => ({
      day,
      fear: kind === 'good' ? 30 : 40,
      depression: kind === 'good' ? 32 : 48,
      social: kind === 'good' ? 28 : 52,
      fatigue: 34,
      peakFear: kind === 'good' ? 40 : 70,
      peakDepression: kind === 'good' ? 42 : 60,
      peakSocial: kind === 'good' ? 44 : 66,
    }))
    this.peak = { fear: this.fear, depression: this.depression, social: this.social }
  }

  debugResolve(kind: EndingId): DayReport {
    this.debugPrepare(kind)
    if (kind === 'crisis') {
      const signal = this.advanceCrisis(5)
      if (signal !== 'crisis') throw new Error('Кризис не сработал на заданных порогах')
      return this.triggerCrisis()
    }
    return this.finishShift(true)
  }

  clock(): string {
    return formatClock(this.minute)
  }

  objective(): string | null {
    if (this.day > 3) return null
    if (this.servedToday < 1 && !this.order) return 'Подойди к посетителю и нажми E.'
    if (this.order && !this.order.brewed) return 'Собери напиток у кофемашины. Чек можно сверить блокнотом.'
    if (this.order?.brewed) return 'Отнеси напиток тому, кто его заказал.'
    if (this.stationDirty) return 'Убери стойку у мойки.'
    if (!this.usedRestore) return 'Можно зайти в подсобку или закрыть смену в комнате отдыха.'
    return 'Когда будешь готова — заверши смену у кровати.'
  }

  crisisLine(): string | null {
    if (this.crisisMeter < 20) return null
    const p = Math.round((this.crisisMeter / balance.crisis.durationMinutes) * 100)
    return `Перегруз держится уже заметно (${Math.min(100, p)}%). Помощь всё ещё открыта.`
  }
}

function phaseLine(phase: Phase): string {
  if (phase === 'day') return 'День. В зале больше обычных заказов.'
  if (phase === 'evening') return 'Вечер. Свет из окон стал рыжим, людей меньше.'
  if (phase === 'night') return 'Ночь. Можно остаться ещё ненадолго или уйти спать.'
  return 'Утро.'
}

function actionTitle(id: ActionId): string {
  const names: Record<ActionId, string> = {
    breath: 'дыхание',
    shortBreak: 'подсобка',
    water: 'вода',
    food: 'еда',
    colleague: 'разговор с Ниной',
    notebook: 'блокнот',
    lights: 'свет',
  }
  return names[id]
}

function actionReason(id: ActionId, key: ScaleKey): string {
  const map: Record<ActionId, string> = {
    breath: 'короткая дыхательная пауза',
    shortBreak: 'тишина в подсобке',
    water: 'вода и несколько минут сидя',
    food: 'еда',
    colleague: 'разговор с Ниной',
    notebook: 'запись совпала с заказом',
    lights: 'свет',
  }
  return map[id] || key
}

function actionMessage(id: ActionId): string {
  const map: Record<ActionId, string> = {
    breath: 'Ты считаешь выдохи. Зал никуда не делся, но стал чуть дальше.',
    shortBreak: 'Подсобка пахнет кофе и картоном. Нина присматривает за стойкой.',
    water: 'Стакан воды. Маленькое, настоящее действие.',
    food: 'Ты ешь не на бегу. Это тоже часть смены.',
    colleague: 'Нина говорит тихо: «Ты не обязана тянуть это одна. Я здесь».',
    notebook: 'В блокноте настоящий заказ и имя. То, что плыло на чеке, не переписало реальность.',
    lights: 'Свет щёлкает мягко.',
  }
  return map[id]
}

export const game = new Session()
