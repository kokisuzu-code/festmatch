import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const spotCheckout = await readFile(new URL('../src/app/api/stripe/organizer/spot/route.ts', import.meta.url), 'utf8')
const webhook = await readFile(new URL('../src/app/api/stripe/webhook/route.ts', import.meta.url), 'utf8')
const migration = await readFile(new URL('../supabase/migrations/20260720071848_organizer_spot_one_time_per_event.sql', import.meta.url), 'utf8')
const dashboard = await readFile(new URL('../src/app/organizer/page.tsx', import.meta.url), 'utf8')

test('organizer Spot is a one-time ¥250,000 payment for one event', () => {
  assert.match(spotCheckout, /mode: 'payment'/)
  assert.match(spotCheckout, /organizerSpotPriceId/)
  assert.match(spotCheckout, /event_id/)
  assert.match(spotCheckout, /payment_intent_data/)
  assert.match(spotCheckout, /maximumMonths/)
  assert.doesNotMatch(spotCheckout, /mode: 'subscription'/)
  assert.doesNotMatch(spotCheckout, /subscription_data/)
})

test('a Spot payment entitles only its linked event for up to three months', () => {
  assert.match(webhook, /metadata\.kind !== 'organizer_spot'/)
  assert.match(webhook, /session\.payment_status !== 'paid'/)
  assert.match(webhook, /organizer_spot_contracts/)
  assert.match(webhook, /checkout\.session\.async_payment_succeeded/)
  assert.match(migration, /event_id uuid not null unique references public\.events/)
  assert.match(migration, /amount_yen integer not null default 250000/)
  assert.match(migration, /spot\.event_id = events\.id/)
  assert.match(migration, /spot\.access_ends_at > now\(\)/)
  assert.match(migration, /organizer\.billing_plan = 'annual'/)
  assert.doesNotMatch(migration, /billing_plan in \('annual', 'spot'\)/)
  assert.match(dashboard, /yen\(250000\).*イベント（一括・最大3か月）/)
})
