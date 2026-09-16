import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const page = await readFile(new URL('../src/app/(marketing)/business/page.tsx', import.meta.url), 'utf8')
const board = await readFile(new URL('../src/app/(marketing)/business/BusinessBoard.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/app/(marketing)/business/business.css', import.meta.url), 'utf8')
const home = await readFile(new URL('../src/app/(marketing)/page.tsx', import.meta.url), 'utf8')

test('business page presents the organizer workflow as a dedicated route', () => {
  assert.match(page, /応募から当日まで/)
  assert.match(page, /募集、審査、連絡、配置、売上報告/)
  assert.equal((page.match(/\["0[1-6]"/g) ?? []).length, 6)
  assert.match(home, /href="\/business">主催者の方/)
})

test('business hero uses a live data board rather than decorative imagery', () => {
  assert.match(page, /<BusinessBoard \/>/)
  assert.match(board, /window\.setInterval/)
  assert.match(board, /LIVE DEMO/)
  assert.equal((board.match(/stage: "approved"/g) ?? []).length, 7)
  assert.match(css, /\.fmb-node \{ transition: transform/)
})

test('business page stays usable on mobile and reduced-motion devices', () => {
  assert.match(css, /@media \(max-width: 700px\)/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /\.fmb-price-grid \{ grid-template-columns: 1fr;/)
})
