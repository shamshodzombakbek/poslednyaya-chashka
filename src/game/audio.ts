import { game } from './session'

/** Процедурный звук: без внешних файлов. Громкость эффектов и атмосферы разделены. */
export class CafeAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfx: GainNode | null = null
  private ambient: GainNode | null = null
  private hum: OscillatorNode | null = null
  private humGain: GainNode | null = null
  private rain: AudioBufferSourceNode | null = null
  private rainGain: GainNode | null = null
  private noise: AudioBuffer | null = null
  private started = false

  unlock(): void {
    if (this.started) return
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(ctx.destination)
    this.sfx = ctx.createGain()
    this.sfx.gain.value = game.settings.sfx
    this.sfx.connect(this.master)
    this.ambient = ctx.createGain()
    this.ambient.gain.value = game.settings.ambient
    this.ambient.connect(this.master)
    const seconds = 2
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = last * 0.98 + white * 0.02
      data[i] = last * 3.2
    }
    this.noise = buffer
    this.hum = ctx.createOscillator()
    this.hum.frequency.value = 58
    this.humGain = ctx.createGain()
    this.humGain.gain.value = 0
    this.hum.connect(this.humGain)
    this.humGain.connect(this.ambient)
    this.hum.start()
    this.started = true
    void ctx.resume()
  }

  applyVolumes(): void {
    if (!this.sfx || !this.ambient) return
    this.sfx.gain.value = game.settings.sfx
    this.ambient.gain.value = game.settings.ambient
  }

  setRoom(night: boolean, fridge: boolean, steps: boolean): void {
    this.unlock()
    if (!this.ctx || !this.ambient || !this.humGain) return
    this.humGain.gain.setTargetAtTime(fridge || night ? (fridge ? 0.045 : 0.02) : 0.012, this.ctx.currentTime, 0.4)
    if (night && !this.rain && this.noise) {
      const src = this.ctx.createBufferSource()
      src.buffer = this.noise
      src.loop = true
      const filter = this.ctx.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.value = 700
      this.rainGain = this.ctx.createGain()
      this.rainGain.gain.value = 0.22
      src.connect(filter)
      filter.connect(this.rainGain)
      this.rainGain.connect(this.ambient)
      src.start()
      this.rain = src
    }
    if (!night && this.rain) {
      try {
        this.rain.stop()
      } catch {
        /* already stopped */
      }
      this.rain = null
    }
    if (steps && Math.random() < 0.02) this.foot(true)
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number): void {
    if (!this.ctx || !this.sfx) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(gain, this.ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur)
    osc.connect(g)
    g.connect(this.sfx)
    osc.start()
    osc.stop(this.ctx.currentTime + dur + 0.02)
  }

  blip(): void {
    this.unlock()
    this.tone(520, 0.08, 'sine', 0.05)
  }

  clink(): void {
    this.unlock()
    this.tone(880, 0.09, 'triangle', 0.06)
    this.tone(1320, 0.12, 'sine', 0.03)
  }

  foot(soft = false): void {
    this.unlock()
    if (!this.ctx || !this.sfx || !this.noise) return
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const g = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = soft ? 180 : 240
    g.gain.setValueAtTime(soft ? 0.08 : 0.04, this.ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12)
    src.connect(filter)
    filter.connect(g)
    g.connect(soft ? this.ambient! : this.sfx)
    src.start()
    src.stop(this.ctx.currentTime + 0.14)
  }
}

export const audio = new CafeAudio()
