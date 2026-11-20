import { randomInt } from 'node:crypto'

type Point = readonly [number, number]
type Stroke = readonly Point[]

const P_BOWL: Stroke = [[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]

/**
 * Each character as pen strokes on a 4 x 6 grid. Characters that read alike (0/O, 1/I, 5/S, 2/Z, 8/B) are left out,
 * so a person never has to guess between two.
 */
const GLYPHS: Readonly<Record<string, readonly Stroke[]>> = {
  A: [[[0, 6], [2, 0], [4, 6]], [[1, 4], [3, 4]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  J: [[[4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  P: [P_BOWL],
  R: [P_BOWL, [[2, 3], [4, 6]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 3], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  '2': [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]],
  '3': [[[0, 0], [4, 0], [2, 2.5], [3, 2.5], [4, 3.5], [4, 5], [3, 6], [1, 6], [0, 5]]],
  '4': [[[3, 6], [3, 0], [0, 4], [4, 4]]],
  '6': [[[4, 0.5], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]]],
  '7': [[[0, 0], [4, 0], [1.5, 6]]],
  '9': [[[4, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5.5]]],
}

export const CAPTCHA_ALPHABET = Object.keys(GLYPHS).join('')

const WIDTH = 220
const HEIGHT = 72
const CELL_WIDTH = 38
const UNIT_X = 5.2
const UNIT_Y = 6.2
const GLYPH_WIDTH_UNITS = 4
const GLYPH_HEIGHT_UNITS = 6
const MAX_TILT_DEGREES = 16
const MAX_SHIFT_Y = 7
const JITTER_HUNDREDTHS = 22
const NOISE_LINES = 4
const INK = '#2b2723'
const PRECISION = 10

/** A random number in [-max, max], to one decimal place. */
const spread = (max: number): number => randomInt(-max * PRECISION, max * PRECISION + 1) / PRECISION
const jitter = (): number => randomInt(-JITTER_HUNDREDTHS, JITTER_HUNDREDTHS + 1) / 100
const round = (value: number): number => Math.round(value * PRECISION) / PRECISION

function strokePath(stroke: Stroke): string {
  return stroke
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${round((x + jitter() - GLYPH_WIDTH_UNITS / 2) * UNIT_X)} ${round((y + jitter() - GLYPH_HEIGHT_UNITS / 2) * UNIT_Y)}`)
    .join(' ')
}

function glyph(char: string, index: number, count: number): string {
  const strokes = GLYPHS[char]
  if (!strokes) throw new Error(`No captcha glyph for "${char}"`)
  const left = (WIDTH - count * CELL_WIDTH) / 2
  const x = round(left + CELL_WIDTH * (index + 0.5) + spread(3))
  const y = round(HEIGHT / 2 + spread(MAX_SHIFT_Y))
  const width = round(2.6 + randomInt(0, 9) / PRECISION)
  return `<path transform="translate(${x} ${y}) rotate(${spread(MAX_TILT_DEGREES)})" d="${strokes.map(strokePath).join(' ')}" stroke-width="${width}"/>`
}

function noiseLine(): string {
  const y = (): number => randomInt(8, HEIGHT - 8)
  return `<path d="M0 ${y()} C${randomInt(40, 90)} ${y()} ${randomInt(120, 180)} ${y()} ${WIDTH} ${y()}" stroke-width="1.4" opacity="0.45"/>`
}

/**
 * Draws the code as jittered, tilted pen strokes with lines through them. The characters exist only as path
 * coordinates, so the answer cannot be read out of the markup the way it could from `<text>`.
 */
export function renderCaptchaSvg(code: string): string {
  const chars = [...code]
  const glyphs = chars.map((char, index) => glyph(char, index, chars.length)).join('')
  const noise = Array.from({ length: NOISE_LINES }, noiseLine).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
    `<g fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">${noise}${glyphs}</g></svg>`
  )
}
