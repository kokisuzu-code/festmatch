import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const layout = await readFile(new URL('../src/app/layout.tsx', import.meta.url), 'utf8')
const feedback = await readFile(new URL('../src/components/NavigationFeedback.tsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8')

test('every route mounts immediate navigation feedback', () => {
  assert.match(layout, /<NavigationFeedback \/>/)
  assert.match(feedback, /document\.addEventListener\('click', handleClick, true\)/)
  assert.match(feedback, /document\.addEventListener\('submit', handleSubmit, true\)/)
  assert.match(feedback, /読み込み中…/)
})

test('pending actions expose a visible and accessible busy state', () => {
  assert.match(styles, /button\[aria-busy="true"\]::before/)
  assert.match(styles, /\.navigation-progress/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})
