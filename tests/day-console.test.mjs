import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const page = await readFile(new URL('../src/app/day-console/page.tsx', import.meta.url), 'utf8')
const consoleSource = await readFile(new URL('../src/app/day-console/DayConsole.tsx', import.meta.url), 'utf8')
const organizerShell = await readFile(new URL('../src/components/OrganizerShell.tsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('../src/app/day-console/day-console.css', import.meta.url), 'utf8')

test('day console is organizer-protected and loads production event data', () => {
  assert.match(page, /requireRole\('organizer'\)/)
  assert.match(page, /from\('events'\)/)
  assert.match(page, /from\('event_spaces'\)/)
  assert.match(page, /from\('applications'\)/)
  assert.match(page, /from\('vendors_public'\)/)
})

test('organizer navigation exposes the day console', () => {
  assert.match(organizerShell, /href: '\/day-console', label: '当日運営'/)
})

test('the Sites day-control feature set remains available', () => {
  for (const label of ['当日ダッシュボード', '会場マップ', '出店者管理', '全体配信', '要対応', '運営チェック', 'タイムライン', 'PDFをAI取り込み']) {
    assert.ok(consoleSource.includes(label), `${label} should remain in the migrated console`)
  }
})

test('day-console styles are isolated from the existing production UI', () => {
  assert.match(styles, /\.day-console-page \.sidebar/)
  assert.doesNotMatch(styles, /(^|\n)\.sidebar\s*\{/)
})
