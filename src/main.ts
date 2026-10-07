import Phaser from 'phaser'
import { audio } from './game/audio'
import { loadSettings } from './game/save'
import { game } from './game/session'
import { BootScene } from './scenes/BootScene'
import { CafeScene } from './scenes/CafeScene'
import { ui } from './ui/overlay'

loadSettings()
if (new URLSearchParams(location.search).has('dev')) game.settings.dev = true

const phaser = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  backgroundColor: '#1b1614',
  banner: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: 960,
    height: 640,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 } },
  },
  audio: { noAudio: true },
  scene: [BootScene, CafeScene],
})

ui.attach(phaser)
if (game.settings.dev) ui.openDev()

window.addEventListener('pointerdown', () => audio.unlock(), { once: true })
