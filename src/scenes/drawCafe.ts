import Phaser from 'phaser'
import { blocks, seats, spawnPoint, WORLD, zoneLabels } from '../game/layout'

const wall = 0x5a382e
const wallEdge = 0x3e261f

export function drawCafe(scene: Phaser.Scene): void {
  scene.add.tileSprite(WORLD.w / 2, 32, WORLD.w, 64, 'floor-street').setDepth(0)
  scene.add.tileSprite(446, 498, 828, 804, 'floor-hall').setDepth(0)
  scene.add.tileSprite(1147, 398, 522, 604, 'floor-staff').setDepth(0)
  scene.add.tileSprite(1294, 218, 206, 244, 'floor-storage').setDepth(0)
  scene.add.tileSprite(1204, 812, 408, 176, 'floor-rest').setDepth(0)

  const rug = scene.add.rectangle(1036, 430, 220, 70, 0x8d4d3a, 0.35)
  rug.setDepth(1)

  for (const pane of [180, 420, 680, 1040]) {
    const glass = scene.add.rectangle(pane, 48, 120, 36, 0xc9d7e8, 0.35)
    glass.setStrokeStyle(3, 0x6e5438, 1)
    glass.setDepth(1)
  }
  const lamp = scene.add.circle(250, 28, 7, 0xf2c14e, 0.95).setDepth(2)
  scene.add.circle(250, 28, 18, 0xf2c14e, 0.25).setDepth(2)
  void lamp

  for (const block of blocks) {
    const color =
      block.kind === 'wall'
        ? wall
        : block.kind === 'table'
          ? 0x8a5438
          : block.kind === 'machine'
            ? 0x2e2a28
            : block.kind === 'sink'
              ? 0xd5ded8
              : block.kind === 'bed'
                ? 0x6a4c78
                : 0xa36b45
    const rect = scene.add.rectangle(block.x + block.w / 2, block.y + block.h / 2, block.w, block.h, color, 1)
    rect.setStrokeStyle(2, block.kind === 'wall' ? wallEdge : 0x000000, block.kind === 'wall' ? 0.35 : 0.15)
    rect.setDepth(block.kind === 'wall' ? 4 : 5)
    if (block.kind === 'table') {
      scene.add.rectangle(block.x + block.w / 2, block.y + 10, block.w - 14, 8, 0xd8b98a, 1).setDepth(6)
    }
    if (block.kind === 'machine') {
      scene.add.rectangle(block.x + 28, block.y + 16, 22, 16, 0xb87333, 1).setDepth(6)
      scene.add.rectangle(block.x + 70, block.y + 18, 16, 22, 0x111111, 1).setDepth(6)
    }
    if (block.kind === 'bed') {
      scene.add.rectangle(block.x + 18, block.y + 20, 22, 16, 0xf0e6dc, 1).setDepth(6)
    }
  }

  for (const label of zoneLabels) {
    scene.add
      .text(label.x, label.y, label.text, {
        fontFamily: 'Georgia, "Iowan Old Style", serif',
        fontSize: '15px',
        color: '#6d5648',
      })
      .setAlpha(0.72)
      .setDepth(7)
  }

  for (const seat of seats) {
    scene.add.rectangle(seat.x, seat.y + 28, 16, 16, 0x6b3e2e, 1).setDepth(4)
  }

  scene.add.circle(180, 180, 16, 0x3e6b45, 1).setDepth(6)
  scene.add.rectangle(180, 200, 6, 18, 0x5c3b28, 1).setDepth(6)
  scene.add.circle(760, 180, 14, 0x2f6a4a, 1).setDepth(6)
  scene.add.rectangle(760, 198, 5, 16, 0x5c3b28, 1).setDepth(6)

  const lights: Phaser.Math.Vector2[] = [
    new Phaser.Math.Vector2(300, 220),
    new Phaser.Math.Vector2(560, 420),
    new Phaser.Math.Vector2(1040, 300),
    new Phaser.Math.Vector2(1280, 200),
    new Phaser.Math.Vector2(1200, 820),
  ]
  const lamps: Phaser.GameObjects.Arc[] = []
  for (const light of lights) {
    const glow = scene.add.circle(light.x, light.y, 70, 0xffc56b, 0.13)
    glow.setBlendMode(Phaser.BlendModes.ADD)
    glow.setDepth(12)
    lamps.push(glow)
  }
  scene.data.set('lamps', lamps)
  void spawnPoint
}

export function addBlockers(scene: Phaser.Scene, player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
  for (const block of blocks) {
    const rect = scene.add.rectangle(block.x + block.w / 2, block.y + block.h / 2, block.w, block.h, 0x000000, 0)
    rect.setDepth(4)
    scene.physics.add.existing(rect, true)
    scene.physics.add.collider(player, rect)
  }
}
