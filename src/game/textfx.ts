export function distortText(src: string, tick: number): string {
  const glyphs = 'абвгдежзиклмнопрстуфхцчшщыэюя'
  const chars = [...src]
  if (!chars.length) return src
  const i = Math.abs(Math.floor(tick / 450)) % chars.length
  const j = Math.abs(i * 3 + 1) % chars.length
  if (chars[i] && chars[i] !== ' ') chars[i] = glyphs[Math.abs(tick + i) % glyphs.length]!
  if (j !== i && chars[j] && chars[j] !== ' ') chars[j] = glyphs[Math.abs(tick * 2 + j) % glyphs.length]!
  return chars.join('')
}
