import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const page = await readFile(new URL('../src/app/day-console/page.tsx', import.meta.url), 'utf8')
const consoleSource = await readFile(new URL('../src/app/day-console/DayConsole.tsx', import.meta.url), 'utf8')
const api = await readFile(new URL('../src/app/api/event-operations/[eventId]/route.ts', import.meta.url), 'utf8')
const mapSource = await readFile(new URL('../src/app/day-console/OperationMap.tsx', import.meta.url), 'utf8')
const organizerShell = await readFile(new URL('../src/components/OrganizerShell.tsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('../src/app/day-console/day-console.css', import.meta.url), 'utf8')

test('day console is organizer-protected and loads production event data', () => {
  assert.match(page, /requireRole\('organizer'\)/)
  assert.match(page, /from\('events'\)/)
  assert.match(api, /from\('event_spaces'\)/)
  assert.match(api, /from\('applications'\)/)
  assert.match(api, /from\('vendors_public'\)/)
})

test('organizer navigation exposes the day console', () => {
  assert.match(organizerShell, /href: '\/day-console', label: '当日運営'/)
})

test('the Sites day-control feature set remains available', () => {
  for (const label of ['当日ダッシュボード', '会場マップ', '出店者管理', '全体配信', '要対応', '運営チェック', 'タイムライン', 'PDFをAI取り込み']) {
    assert.ok((consoleSource + mapSource).includes(label), `${label} should remain in the migrated console`)
  }
})

test('sidebar navigation switches between dedicated operation workspaces', () => {
  for (const workspace of ['overview', 'map', 'vendors', 'broadcast', 'attention', 'checklist', 'timeline']) {
    assert.ok(consoleSource.includes(`${workspace}: {`), `${workspace} should have its own workspace metadata`)
    assert.ok(styles.includes(`view-${workspace}`), `${workspace} should have a dedicated workspace layout`)
  }
  assert.match(consoleSource, /className="card vendors-workspace/)
  assert.match(consoleSource, /className="broadcast-workspace"/)
  assert.match(consoleSource, /setActiveNav\(id\)/)
  assert.doesNotMatch(styles, /nav button:nth-child\(5\).*display:none/)
})

test('day-console styles are isolated from the existing production UI', () => {
  assert.match(styles, /\.day-console-page \.sidebar/)
  assert.doesNotMatch(styles, /(^|\n)\.sidebar\s*\{/)
})
