import Phaser from 'phaser'

export interface Look {
  hair: number
  skin: number
  shirt: number
  pants: number
  apron?: number
  hood?: boolean
  scar?: boolean
  uncanny?: boolean
  group?: boolean
}

const looks: Record<string, Look> = {
  hero: { hair: 0x2a2238, skin: 0xf0c2a8, shirt: 0x355c7d, pants: 0x2c3142, apron: 0xf4efe6 },
  nina: { hair: 0x8a3e2a, skin: 0xe8b89a, shirt: 0x2f6b4f, pants: 0x243028 },
  sonya: { hair: 0x5a3828, skin: 0xf2c7ad, shirt: 0xc46b7a, pants: 0x3d342c },
  'sonya-alt': { hair: 0xc8c2b8, skin: 0xd9c8c2, shirt: 0xc46b7a, pants: 0x3d342c, uncanny: true },
  igor: { hair: 0x1c1c1c, skin: 0xe0b090, shirt: 0x2e4a73, pants: 0x22262e },
  leonid: { hair: 0x4a463f, skin: 0xd7b094, shirt: 0x6e7058, pants: 0x2a2a28 },
  marina: { hair: 0xc9862a, skin: 0xf0c3a4, shirt: 0xd98a3a, pants: 0x4a3048 },
  pavel: { hair: 0x3a2a24, skin: 0xe2b89a, shirt: 0x7a2e2e, pants: 0x2a2422 },
  alina: { hair: 0x22283a, skin: 0xf0c8ae, shirt: 0x3d6b8a, pants: 0x2a2438, group: true },
  renata: { hair: 0x1a1a22, skin: 0xdcb59a, shirt: 0x3e3a55, pants: 0x23232a },
  gleb: { hair: 0x1a1816, skin: 0xc99270, shirt: 0x3d4634, pants: 0x1c1e18, hood: true, scar: true },
}

function paintFixed(g: Phaser.GameObjects.Graphics, look: Look): void {
  g.clear()
  g.fillStyle(0x000000, 0.22)
  g.fillEllipse(24, 66, 28, 10)
  g.fillStyle(look.pants, 1)
  g.fillRoundedRect(14, 42, 8, 18, 3)
  g.fillRoundedRect(26, 42, 8, 18, 3)
  g.fillStyle(0x241c18, 1)
  g.fillRoundedRect(12, 58, 12, 6, 2)
  g.fillRoundedRect(24, 58, 12, 6, 2)
  g.fillStyle(look.shirt, 1)
  g.fillRoundedRect(11, 30, 26, 18, 6)
  if (look.apron !== undefined) {
    g.fillStyle(look.apron, 1)
    g.fillRoundedRect(16, 32, 16, 16, 3)
  }
  if (look.group) {
    g.fillStyle(0x315f8a, 1)
    g.fillCircle(38, 24, 8)
    g.fillStyle(look.skin, 1)
    g.fillCircle(38, 26, 6)
  }
  if (look.hood) {
    g.fillStyle(0x2a3128, 1)
    g.fillRoundedRect(8, 6, 32, 26, 12)
    g.fillStyle(look.skin, 1)
    g.fillCircle(24, 22, 9)
  } else {
    g.fillStyle(look.hair, 1)
    g.fillCircle(24, 15, 13)
    g.fillRect(11, 16, 26, 12)
    g.fillStyle(look.skin, 1)
    g.fillCircle(24, 22, 11)
  }
  const eyeY = look.uncanny ? 24 : 21
  g.fillStyle(0xf7f4ee, 1)
  g.fillEllipse(20, eyeY, 4.2, look.uncanny ? 2.2 : 3.2)
  g.fillEllipse(28, eyeY, 4.2, look.uncanny ? 2.2 : 3.2)
  g.fillStyle(look.uncanny ? 0x7d8ea4 : 0x241c18, 1)
  g.fillCircle(20, eyeY + (look.uncanny ? 0.6 : 0), 1.3)
  g.fillCircle(28, eyeY, 1.3)
  if (!look.uncanny) {
    g.fillStyle(0xe7a090, 0.4)
    g.fillCircle(16, 25, 2)
    g.fillCircle(32, 25, 2)
  }
  if (look.scar) {
    g.lineStyle(1, 0xc48b84, 0.95)
    g.lineBetween(30, 16, 35, 25)
  }
}

export function generateTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('hero')) return
  const g = scene.add.graphics({ x: 0, y: 0 })
  const keys: [string, Look][] = [
    ['hero', looks.hero!],
    ['nina', looks.nina!],
    ['v-sonya', looks.sonya!],
    ['v-sonya-alt', looks['sonya-alt']!],
    ['v-igor', looks.igor!],
    ['v-leonid', looks.leonid!],
    ['v-marina', looks.marina!],
    ['v-pavel', looks.pavel!],
    ['v-alina', looks.alina!],
    ['v-renata', looks.renata!],
    ['v-gleb', looks.gleb!],
  ]
  for (const [key, look] of keys) {
    paintFixed(g, look)
    g.generateTexture(key, 48, 72)
  }
  g.clear()
  g.fillStyle(0x0d1522, 0.55)
  g.fillRoundedRect(16, 18, 16, 40, 8)
  g.fillCircle(24, 16, 9)
  g.generateTexture('figure', 48, 72)
  g.clear()
  g.fillStyle(0xffffff, 1)
  g.fillCircle(8, 8, 6)
  g.generateTexture('soft', 16, 16)
  g.clear()
  g.fillStyle(0xd7b48a, 1)
  g.fillRect(0, 0, 64, 64)
  g.lineStyle(1, 0xb08960, 0.45)
  for (let y = 10; y < 64; y += 16) g.lineBetween(0, y, 64, y)
  g.generateTexture('floor-hall', 64, 64)
  g.clear()
  g.fillStyle(0xc9c0b2, 1)
  g.fillRect(0, 0, 64, 64)
  g.lineStyle(1, 0xaea394, 0.6)
  g.strokeRect(1, 1, 30, 30)
  g.strokeRect(33, 33, 30, 30)
  g.generateTexture('floor-staff', 64, 64)
  g.clear()
  g.fillStyle(0xb7a48e, 1)
  g.fillRect(0, 0, 64, 64)
  g.generateTexture('floor-storage', 64, 64)
  g.clear()
  g.fillStyle(0xd8c2ba, 1)
  g.fillRect(0, 0, 64, 64)
  g.fillStyle(0xcaa89e, 0.5)
  g.fillCircle(32, 32, 18)
  g.generateTexture('floor-rest', 64, 64)
  g.clear()
  g.fillStyle(0x243044, 1)
  g.fillRect(0, 0, 64, 64)
  g.fillStyle(0x3d4e66, 0.5)
  for (let i = 0; i < 8; i++) g.fillRect(i * 8, 0, 3, 64)
  g.generateTexture('floor-street', 64, 64)
  g.destroy()
}
