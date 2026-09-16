import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const helper = await readFile(new URL('../src/lib/festmap.ts', import.meta.url), 'utf8')
const card = await readFile(new URL('../src/components/festmap/PublicEventCard.tsx', import.meta.url), 'utf8')
const eventDetail = await readFile(new URL('../src/app/festmap/events/[slug]/page.tsx', import.meta.url), 'utf8')

test('Phase 4 separates verified external events from application-capable events', () => {
  assert.match(helper, /from\('events'\)/)
  assert.match(helper, /from\('external_events'\)/)
  assert.match(helper, /eq\('status', 'published'\)/)
  assert.match(helper, /is_external: false/)
  assert.match(helper, /is_external: true/)
})

test('external event links are isolated from FestMatch applications and are safe', () => {
  assert.match(card, /external-event/)
  assert.match(card, /rel="nofollow noopener noreferrer"/)
  assert.match(card, /public-event-card-content/)
  assert.match(card, /public-event-card-action/)
  assert.match(card, /public-status/)
  assert.match(eventDetail, /event\.is_external/)
  assert.match(eventDetail, /event\.is_external \? event\.official_url/)
})

test('public event metadata has an explicit canonical URL', () => {
  assert.match(eventDetail, /alternates: \{ canonical:/)
  assert.match(eventDetail, /application\/ld\+json/)
})
