import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { VISUAL_WEB_PORT } from './env'

export const WEB_ROOT = fileURLToPath(new URL('../..', import.meta.url))
export const REFERENCE_DIR = path.join(WEB_ROOT, 'tests', 'visual', 'reference')
export const REFERENCE_FILE = path.join(REFERENCE_DIR, 'Art Houz Website.dc.html')
export const REFERENCE_ASSETS = ['support.js', 'image-slot.js'] as const
export const RESULTS_DIR = path.join(WEB_ROOT, 'test-results')
export const NORMALISED_FILE = path.join(RESULTS_DIR, 'reference.html')
export const VISUAL_RESULTS_DIR = path.join(RESULTS_DIR, 'visual')

export const PORT_URL = process.env.VISUAL_PORT_URL ?? `http://localhost:${VISUAL_WEB_PORT}`
/** The API is served by the same Next server; `normaliseReference` and the setup probe take this base. */
export const API_BASE = `${PORT_URL}/api`
