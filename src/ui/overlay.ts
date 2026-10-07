import { phaseNames, scaleNames } from '../data/balance'
import { visitors } from '../data/visitors'
import { cups, ingredients } from '../data/recipes'
import { audio } from '../game/audio'
import { endingText } from '../game/endings'
import { applySave, clearSave, continuable, readSave, saveSettings } from '../game/save'
import { game } from '../game/session'
import type { Choice } from '../data/dialogues'
import type { DayReport, EndingId, ScaleKey } from '../game/types'

export interface HudModel {
  day: number
  phase: string
  clock: string
  money: number
  scales: Record<ScaleKey, number>
  crisis: string | null
  order: string
  orderNote: string
  logs: string[]
  prompt: string
  promptEnabled: boolean
  objective: string | null
  speed: number
  speedLocked: boolean
  stage: number
  lightLabel: string
  names: typeof scaleNames
}

interface BrewOpts {
  title: string
  brew: string
  fridge: boolean
  ticket: () => string
  truth: string
  onCup: (id: string) => void
  onIng: (id: string) => void
  onCook: () => void
  onUndo: () => void
  onClose: () => void
  onFridge: () => void
}

interface CafeHandlers {
  interact: () => void
  breath: () => void
  notebook: () => void
  lights: () => void
  speed: (value: number) => void
  skip: () => void
  dev: (kind: EndingId) => void
  devDay: (day: number) => void
  devPhase: (minute: number) => void
  devScales: (fear: number, depression: number, social: number, fatigue: number) => void
  devSpawn: (id: string) => void
  menu: () => void
  resume: () => void
}

class Overlay {
  private kindName = ''
  private handlers: CafeHandlers | null = null
  private phaser: Phaser.Game | null = null
  private built = false
  private brewTimer = 0

  attach(phaser: Phaser.Game): void {
    this.phaser = phaser
    this.ensureHud()
    const stage = document.getElementById('stage')
    if (stage && !document.getElementById('fx')) {
      const fx = document.createElement('div')
      fx.id = 'fx'
      stage.appendChild(fx)
    }
  }

  bindCafe(handlers: CafeHandlers): void {
    this.handlers = handlers
  }

  kind(): string {
    return this.kindName
  }

  enterPlay(): void {
    document.body.classList.remove('in-menu')
  }

  showMenu(): void {
    document.body.classList.add('in-menu')
    this.kindName = 'menu'
    const save = readSave()
    const can = continuable()
    const past = save?.completedEnding ? endingText[save.completedEnding].title : ''
    this.modal(`
      <section class="panel menu-panel">
        <p class="eyebrow">кофейня у ночного окна</p>
        <h1>Последняя чашка</h1>
        <p class="lead">Круглосуточная смена. Тридцать дней. Кира приходит сюда не для того, чтобы за месяц вылечиться, а чтобы научиться быть среди людей и вовремя уходить отдыхать.</p>
        <div class="stack">
          <button id="new-game" type="button">Новая игра</button>
          <button id="continue" type="button" ${can ? '' : 'disabled'}>Продолжить${can && save ? ` · день ${save.day}` : ''}</button>
          <button id="settings" type="button">Настройки</button>
        </div>
        ${past ? `<p class="quiet">Прошлое прохождение: ${past}. Можно начать снова.</p>` : ''}
        <p class="quiet">WASD или стрелки — ход. E — действие. Esc — пауза. F2 — проверка дней и концовок.</p>
      </section>
    `)
    document.getElementById('new-game')?.addEventListener('click', () => this.newGame())
    document.getElementById('continue')?.addEventListener('click', () => this.continueGame())
    document.getElementById('settings')?.addEventListener('click', () => this.showSettings())
  }

  private newGame(): void {
    if (continuable() && !window.confirm('Начать заново? Незаконченное сохранение сотрётся.')) return
    audio.unlock()
    clearSave()
    game.resetNew()
    this.startCafe()
  }

  private continueGame(): void {
    const data = readSave()
    if (!data || data.completedEnding) return
    audio.unlock()
    applySave(data)
    this.startCafe()
  }

  private startCafe(): void {
    audio.unlock()
    document.body.classList.remove('in-menu')
    this.close()
    const phaser = this.phaser
    requestAnimationFrame(() => {
      phaser?.scale.refresh()
      phaser?.scene.start('cafe')
    })
  }

  showSettings(): void {
    this.kindName = 'settings'
    const s = game.settings
    this.modal(`
      <section class="panel">
        <h2>Настройки</h2>
        <label>Звуки <input id="sfx" type="range" min="0" max="1" step="0.05" value="${s.sfx}" /></label>
        <label>Атмосфера <input id="amb" type="range" min="0" max="1" step="0.05" value="${s.ambient}" /></label>
        <label class="check"><input id="flick" type="checkbox" ${s.reduceFlicker ? 'checked' : ''}/> Отключить мерцание</label>
        <label class="check"><input id="dist" type="checkbox" ${s.reduceDistortion ? 'checked' : ''}/> Уменьшить визуальные искажения</label>
        <div class="row">
          <button id="settings-back" type="button">Назад</button>
        </div>
      </section>
    `)
    const apply = () => {
      game.settings.sfx = num('sfx', game.settings.sfx)
      game.settings.ambient = num('amb', game.settings.ambient)
      game.settings.reduceFlicker = checked('flick')
      game.settings.reduceDistortion = checked('dist')
      saveSettings()
      audio.applyVolumes()
      this.applyBody()
    }
    document.getElementById('sfx')?.addEventListener('input', apply)
    document.getElementById('amb')?.addEventListener('input', apply)
    document.getElementById('flick')?.addEventListener('change', apply)
    document.getElementById('dist')?.addEventListener('change', apply)
    document.getElementById('settings-back')?.addEventListener('click', () => {
      if (document.body.classList.contains('in-menu')) this.showMenu()
      else {
        this.kindName = 'pause'
        this.showPause()
      }
    })
  }

  showPause(): void {
    this.kindName = 'pause'
    this.modal(`
      <section class="panel">
        <h2>Пауза</h2>
        <p>Смена стоит. За окном ничего не происходит, пока ты не вернёшься.</p>
        <div class="stack">
          <button id="resume" type="button">Вернуться в зал</button>
          <button id="pause-settings" type="button">Настройки</button>
          <button id="to-menu" type="button">В главное меню</button>
        </div>
        <p class="quiet">Текущая смена не пишется в сохранение. Сохраняется каждое утро после закрытого дня.</p>
      </section>
    `)
    document.getElementById('resume')?.addEventListener('click', () => this.dismiss())
    document.getElementById('pause-settings')?.addEventListener('click', () => this.showSettings())
    document.getElementById('to-menu')?.addEventListener('click', () => {
      if (window.confirm('Выйти в меню? Эта смена пропадёт до последнего утра.')) this.handlers?.menu()
    })
  }

  showIntro(text: string, onOk: () => void): void {
    this.kindName = 'intro'
    this.modal(`
      <section class="panel wide">
        <h2>Перед сменой</h2>
        <p class="prose">${escapeHtml(text).replaceAll('\n', '<br/>')}</p>
        <button id="intro-ok" type="button">Я на месте</button>
      </section>
    `)
    document.getElementById('intro-ok')?.addEventListener('click', onOk)
  }

  showTalk(name: string, kind: string, line: string, choices: readonly Choice[], onPick: (index: number) => void): void {
    this.kindName = 'talk'
    const buttons = choices
      .map(
        (choice, index) =>
          `<button type="button" data-choice="${index}">${escapeHtml(choice.text)}</button>`,
      )
      .join('')
    this.modal(`
      <section class="panel wide talk">
        <p class="eyebrow">${escapeHtml(kind)}</p>
        <h2>${escapeHtml(name)}</h2>
        <p class="prose">${escapeHtml(line)}</p>
        <div class="stack">${buttons}</div>
      </section>
    `)
    this.root().querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.choice)
        button.disabled = true
        onPick(index)
      })
    })
  }

  showReply(name: string, reply: string, nina: string | undefined, onOk: () => void): void {
    this.kindName = 'reply'
    this.modal(`
      <section class="panel wide talk">
        <h2>${escapeHtml(name)}</h2>
        <p class="prose">${escapeHtml(reply)}</p>
        ${nina ? `<p class="nina">Нина: ${escapeHtml(nina)}</p>` : ''}
        <button id="reply-ok" type="button">Дальше</button>
      </section>
    `)
    document.getElementById('reply-ok')?.addEventListener('click', onOk)
  }

  showBrew(opts: BrewOpts): void {
    this.kindName = 'brew'
    window.clearInterval(this.brewTimer)
    const cupButtons = cups
      .map((cup) => `<button type="button" data-cup="${cup.id}">${cup.label}</button>`)
      .join('')
    const ingButtons = ingredients
      .map((item) => `<button type="button" data-ing="${item.id}">${item.label}</button>`)
      .join('')
    this.modal(`
      <section class="panel wide">
        <h2>Стойка</h2>
        <p class="ticket" id="ticket"></p>
        <p id="truth" class="quiet" hidden></p>
        <p id="brew-msg">Выбери чашку, добавь состав по порядку и только потом готовь.</p>
        <div class="grid">${cupButtons}</div>
        <div class="grid">${ingButtons}</div>
        <div class="row">
          <button id="cook" type="button">${escapeHtml(opts.brew)}</button>
          <button id="undo" type="button">Вылить и поправить</button>
          <button id="reveal" type="button">Сверить с блокнотом</button>
          ${opts.fridge ? '<button id="fridge" type="button">Проверить гул</button>' : ''}
          <button id="brew-close" type="button">Отойти</button>
        </div>
      </section>
    `)
    const paint = () => {
      const node = document.getElementById('ticket')
      if (node) node.textContent = `Чек: ${opts.ticket()}`
    }
    paint()
    this.brewTimer = window.setInterval(paint, 450)
    this.root().querySelectorAll<HTMLButtonElement>('[data-cup]').forEach((button) => {
      button.addEventListener('click', () => opts.onCup(button.dataset.cup ?? ''))
    })
    this.root().querySelectorAll<HTMLButtonElement>('[data-ing]').forEach((button) => {
      button.addEventListener('click', () => opts.onIng(button.dataset.ing ?? ''))
    })
    document.getElementById('cook')?.addEventListener('click', opts.onCook)
    document.getElementById('undo')?.addEventListener('click', opts.onUndo)
    document.getElementById('reveal')?.addEventListener('click', () => {
      const node = document.getElementById('truth')
      if (!node) return
      node.hidden = false
      node.textContent = opts.truth
    })
    document.getElementById('fridge')?.addEventListener('click', opts.onFridge)
    document.getElementById('brew-close')?.addEventListener('click', opts.onClose)
  }

  setBrewMessage(text: string): void {
    const node = document.getElementById('brew-msg')
    if (node) node.textContent = text
  }

  showNote(title: string, text: string, onOk: () => void, okLabel = 'Дальше'): void {
    this.kindName = 'note'
    this.modal(`
      <section class="panel">
        <h2>${escapeHtml(title)}</h2>
        <p class="prose">${escapeHtml(text).replaceAll('\n', '<br/>')}</p>
        <div class="row">
          <button id="note-ok" type="button">${escapeHtml(okLabel)}</button>
          <button id="note-cancel" type="button">Отмена</button>
        </div>
      </section>
    `)
    document.getElementById('note-ok')?.addEventListener('click', onOk)
    document.getElementById('note-cancel')?.addEventListener('click', () => this.dismiss())
  }

  showCare(onWater: () => void, onFood: () => void, onClose: () => void): void {
    this.kindName = 'care'
    this.modal(`
      <section class="panel">
        <h2>Комната отдыха</h2>
        <p>Вода и еда помогают не сразу и не бесконечно. Пока ты здесь, ожидание гостей продолжается.</p>
        <div class="stack">
          <button id="act-water" type="button">Выпить воды</button>
          <button id="act-food" type="button">Поесть</button>
          <button id="care-close" type="button">Вернуться в зал</button>
        </div>
      </section>
    `)
    document.getElementById('act-water')?.addEventListener('click', onWater)
    document.getElementById('act-food')?.addEventListener('click', onFood)
    document.getElementById('care-close')?.addEventListener('click', onClose)
  }

  showReport(report: DayReport, onOk: () => void): void {
    this.kindName = 'report'
    const bars = (['fear', 'depression', 'social', 'fatigue'] as ScaleKey[])
      .map((key) => {
        const after = report.afterSleep ? ` → после сна ${Math.round(report.afterSleep[key])}` : ''
        return `<li>${scaleNames[key]}: ${Math.round(report.before[key])}${after}</li>`
      })
      .join('')
    this.modal(`
      <section class="panel wide">
        <p class="eyebrow">день ${report.closedDay} из 30</p>
        <h2>${report.ending ? 'Смена остановлена' : 'Конец смены'}</h2>
        <ul class="plain">
          <li>Выручка: ${report.earned} ₽</li>
          <li>Обслужено самой: ${report.served}</li>
          <li>Переделки: ${report.mistakes}</li>
          <li>Не дождались: ${report.left}</li>
          <li>Отдых: ${report.rest.length ? report.rest.join(', ') : 'без отдельной паузы'}</li>
        </ul>
        <ul class="plain">${bars}</ul>
        ${report.notes.map((note) => `<p>${escapeHtml(note)}</p>`).join('')}
        <p class="achievement">${escapeHtml(report.achievement)}</p>
        <button id="report-ok" type="button">${report.ending ? 'Дальше' : report.nextDay ? `К утру дня ${report.nextDay}` : 'Дальше'}</button>
      </section>
    `)
    document.getElementById('report-ok')?.addEventListener('click', onOk)
  }

  showEnding(id: EndingId, title: string, body: string, onMenu: () => void): void {
    this.kindName = 'ending'
    this.modal(`
      <section class="panel wide ending ending-${id}">
        <p class="eyebrow">${id === 'crisis' ? 'смена закрыта' : 'тридцатый день позади'}</p>
        <h2>${escapeHtml(title)}</h2>
        <p class="prose">${escapeHtml(body)}</p>
        <button id="ending-menu" type="button">В меню</button>
      </section>
    `)
    document.getElementById('ending-menu')?.addEventListener('click', onMenu)
  }

  close(): void {
    window.clearInterval(this.brewTimer)
    this.kindName = ''
    const root = document.getElementById('modals')
    if (root) root.innerHTML = ''
  }

  toggleDev(): void {
    const node = document.getElementById('dev')
    if (!node) return
    node.hidden = !node.hidden
    if (!node.hidden) this.paintDev()
  }

  openDev(): void {
    const node = document.getElementById('dev')
    if (!node) return
    node.hidden = false
    this.paintDev()
  }

  sync(model: HudModel): void {
    this.ensureHud()
    this.applyBody(model)
    setText('hud-day', `День ${model.day} из 30 · ${model.phase}`)
    setText('hud-clock', model.clock)
    setText('hud-money', `${model.money} ₽`)
    for (const key of ['fear', 'depression', 'social', 'fatigue'] as ScaleKey[]) {
      const value = Math.round(model.scales[key])
      setText(`val-${key}`, String(value))
      const bar = document.getElementById(`bar-${key}`)
      if (bar) bar.style.width = `${value}%`
    }
    setText('hud-crisis', model.crisis ?? '')
    setText('hud-order', model.order)
    setText('hud-order-note', model.orderNote)
    setText('hud-objective', model.objective ?? '')
    setText('interact', model.prompt)
    const interact = document.getElementById('interact') as HTMLButtonElement | null
    if (interact) interact.disabled = !model.promptEnabled
    const log = document.getElementById('hud-log')
    if (log) log.innerHTML = model.logs.map((line) => `<li>${escapeHtml(line)}</li>`).join('')
    document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
      button.classList.toggle('on', Number(button.dataset.speed) === model.speed)
      button.disabled = model.speedLocked && Number(button.dataset.speed) !== 1
    })
    const skip = document.getElementById('skip-wait') as HTMLButtonElement | null
    if (skip) skip.disabled = model.speedLocked
    setText('light-state', model.lightLabel)
    document.body.dataset.stage = String(model.stage)
    document.body.dataset.phase = model.phase
  }

  private paintDev(): void {
    const node = document.getElementById('dev')
    if (!node) return
    const options = visitors.map((visitor) => `<option value="${visitor.id}">${visitor.name}</option>`).join('')
    node.innerHTML = `
      <strong>Проверка</strong>
      <label>День <input id="dev-day" type="number" min="1" max="30" value="${game.day}" /></label>
      <button id="dev-day-go" type="button">Перейти к утру</button>
      <div class="row">
        <button type="button" data-phase="480">Утро</button>
        <button type="button" data-phase="780">День</button>
        <button type="button" data-phase="1080">Вечер</button>
        <button type="button" data-phase="1320">Ночь</button>
      </div>
      <label>Страх <input id="dev-fear" type="number" min="0" max="100" value="${Math.round(game.fear)}" /></label>
      <label>Депрессия <input id="dev-dep" type="number" min="0" max="100" value="${Math.round(game.depression)}" /></label>
      <label>Социальное <input id="dev-soc" type="number" min="0" max="100" value="${Math.round(game.social)}" /></label>
      <label>Усталость <input id="dev-fat" type="number" min="0" max="100" value="${Math.round(game.fatigue)}" /></label>
      <button id="dev-scales" type="button">Применить шкалы</button>
      <label>Гость <select id="dev-spawn">${options}</select></label>
      <button id="dev-spawn-go" type="button">Позвать</button>
      <button id="dev-good" type="button">Проверить хорошую концовку</button>
      <button id="dev-middle" type="button">Проверить промежуточную</button>
      <button id="dev-crisis" type="button">Проверить кризис</button>
    `
    document.getElementById('dev-day-go')?.addEventListener('click', () => {
      this.handlers?.devDay(clampDay(num('dev-day', game.day)))
    })
    node.querySelectorAll<HTMLButtonElement>('[data-phase]').forEach((button) => {
      button.addEventListener('click', () => this.handlers?.devPhase(Number(button.dataset.phase)))
    })
    document.getElementById('dev-scales')?.addEventListener('click', () => {
      this.handlers?.devScales(num('dev-fear', game.fear), num('dev-dep', game.depression), num('dev-soc', game.social), num('dev-fat', game.fatigue))
    })
    document.getElementById('dev-spawn-go')?.addEventListener('click', () => {
      const id = (document.getElementById('dev-spawn') as HTMLSelectElement | null)?.value
      if (id) this.handlers?.devSpawn(id)
    })
    document.getElementById('dev-good')?.addEventListener('click', () => this.handlers?.dev('good'))
    document.getElementById('dev-middle')?.addEventListener('click', () => this.handlers?.dev('middle'))
    document.getElementById('dev-crisis')?.addEventListener('click', () => this.handlers?.dev('crisis'))
  }

  private ensureHud(): void {
    if (this.built) return
    this.built = true
    const side = document.getElementById('sidebar')
    const dock = document.getElementById('dock')
    if (side) {
      side.innerHTML = `
        <p class="eyebrow">Кира · смена</p>
        <h1 class="side-title">Последняя чашка</h1>
        <p id="hud-day"></p>
        <p id="hud-clock" class="clock"></p>
        <p id="hud-money" class="money"></p>
        ${(['fear', 'depression', 'social', 'fatigue'] as ScaleKey[])
          .map(
            (key) => `
            <label class="scale">${scaleNames[key]} <span id="val-${key}">0</span>
              <span class="track"><span id="bar-${key}" class="fill fill-${key}"></span></span>
            </label>`,
          )
          .join('')}
        <p id="hud-crisis" class="crisis"></p>
        <section class="order-card">
          <p class="eyebrow">заказ</p>
          <p id="hud-order"></p>
          <p id="hud-order-note" class="quiet"></p>
        </section>
        <div class="row">
          <button id="btn-notebook" type="button">Блокнот</button>
          <button id="btn-breath" type="button">Дыхание</button>
          <button id="btn-lights" type="button">Свет</button>
        </div>
        <p id="light-state" class="quiet"></p>
        <div class="row">
          <button data-speed="1" type="button">1×</button>
          <button data-speed="2" type="button">2×</button>
          <button data-speed="3" type="button">3×</button>
          <button id="skip-wait" type="button">Ждать</button>
        </div>
        <ul id="hud-log"></ul>
      `
    }
    if (dock) {
      dock.innerHTML = `
        <button id="interact" type="button">Подойди ближе</button>
        <p id="hud-objective"></p>
      `
    }
    document.getElementById('btn-notebook')?.addEventListener('click', () => this.handlers?.notebook())
    document.getElementById('btn-breath')?.addEventListener('click', () => this.handlers?.breath())
    document.getElementById('btn-lights')?.addEventListener('click', () => this.handlers?.lights())
    document.getElementById('interact')?.addEventListener('click', () => this.handlers?.interact())
    document.getElementById('skip-wait')?.addEventListener('click', () => this.handlers?.skip())
    document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
      button.addEventListener('click', () => this.handlers?.speed(Number(button.dataset.speed)))
    })
    void phaseNames
  }

  private dismiss(): void {
    this.handlers?.resume()
    this.close()
  }

  private applyBody(model?: HudModel): void {
    document.body.classList.toggle('reduce-flicker', game.settings.reduceFlicker)
    document.body.classList.toggle('reduce-distortion', game.settings.reduceDistortion)
    if (!model) return
    document.body.dataset.stage = String(model.stage)
    const phaseKey =
      model.phase === 'утро' ? 'morning' : model.phase === 'день' ? 'day' : model.phase === 'вечер' ? 'evening' : 'night'
    document.body.dataset.phase = phaseKey
  }

  private modal(html: string): void {
    const root = document.getElementById('modals')
    if (root) root.innerHTML = html
  }

  private root(): HTMLElement {
    return document.getElementById('modals') ?? document.body
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function setText(id: string, text: string): void {
  const node = document.getElementById(id)
  if (node && node.textContent !== text) node.textContent = text
}

function num(id: string, fallback: number): number {
  const value = Number((document.getElementById(id) as HTMLInputElement | null)?.value)
  return Number.isFinite(value) ? value : fallback
}

function checked(id: string): boolean {
  return Boolean((document.getElementById(id) as HTMLInputElement | null)?.checked)
}

function clampDay(day: number): number {
  return Math.max(1, Math.min(30, Math.round(day)))
}

export const ui = new Overlay()
