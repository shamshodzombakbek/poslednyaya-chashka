import Phaser from 'phaser'
import { generateTextures } from '../game/textures'
import { ui } from '../ui/overlay'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  create(): void {
    generateTextures(this)
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#1b1614')
    const g = this.add.graphics()
    g.fillGradientStyle(0x2a1c18, 0x2a1c18, 0x14181f, 0x14181f, 1)
    g.fillRect(0, 0, width, height)
    this.add.rectangle(width * 0.5, height * 0.72, width * 0.7, 80, 0xc4a574, 0.25)
    this.add.circle(width * 0.3, height * 0.28, 18, 0xf2c14e, 0.8)
    this.add.circle(width * 0.3, height * 0.28, 50, 0xf2c14e, 0.12)
    if (this.textures.exists('soft')) {
      const rain = this.add.particles(0, 0, 'soft', {
        x: { min: 0, max: width },
        y: 0,
        lifespan: 1400,
        speedY: { min: 80, max: 160 },
        scale: { start: 0.12, end: 0.02 },
        alpha: { start: 0.3, end: 0 },
        frequency: 80,
        quantity: 1,
      })
      rain.setDepth(2)
    }
    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      g.clear()
      g.fillGradientStyle(0x2a1c18, 0x2a1c18, 0x14181f, 0x14181f, 1)
      g.fillRect(0, 0, size.width, size.height)
    })
    ui.showMenu()
  }
}
