import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const checkout = await readFile(new URL('../src/app/api/stripe/application-checkout/route.ts', import.meta.url), 'utf8')
const webhook = await readFile(new URL('../src/app/api/stripe/webhook/route.ts', import.meta.url), 'utf8')

test('application checkout uses the remote event columns and only completes free applications', () => {
  assert.match(checkout, /booth_fee_yen/)
  assert.match(checkout, /booth_fee_yen_snapshot/)
  assert.match(checkout, /platform_fee_yen/)
  assert.match(checkout, /feeAmount === 0/)
  assert.match(checkout, /Connect 情報を保存するスキーマ追加後/)
  assert.doesNotMatch(checkout, /stripe_account_id|organizer_billing|event_access_purchases/)
  assert.doesNotMatch(checkout, /body\.platform_fee|body\.fee_amount/)
})

test('Stripe webhooks validate signatures and update only source-of-truth tables', () => {
  assert.match(webhook, /constructEvent/)
  assert.match(webhook, /eq\('status', 'approved'\)/)
  assert.match(webhook, /stripe_subscription_id/)
  assert.doesNotMatch(webhook, /stripe_webhook_events|organizer_billing|event_access_purchases/)
})
