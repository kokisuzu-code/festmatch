import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(new URL('../supabase/migrations/20260720000500_remote_schema_baseline.sql', import.meta.url), 'utf8')
const applicationApi = await readFile(new URL('../src/app/api/applications/route.ts', import.meta.url), 'utf8')
const eventActions = await readFile(new URL('../src/app/organizer/events/actions.ts', import.meta.url), 'utf8')

test('Phase 2 prevents approval over an event capacity at the database boundary', () => {
  assert.match(migration, /for update/)
  assert.match(migration, /status in \('approved',\s*'paid'\)/)
  assert.match(migration, /event capacity reached/)
})

test('application status transitions cannot mutate payment or identity columns from the browser', () => {
  assert.match(migration, /create policy applications_update_organizer_decide/)
  assert.match(migration, /status = ANY \(ARRAY\['approved'::text, 'rejected'::text\]\)/)
  assert.match(migration, /paid status can only be set by server \(webhook\)/)
  assert.match(migration, /illegal status transition/)
})

test('event and application inputs are validated server-side', () => {
  assert.match(eventActions, /applicationDeadline.*startsAt/s)
  assert.match(eventActions, /Number\.isFinite/)
  assert.match(applicationApi, /message\.length > 2_000/)
  assert.doesNotMatch(applicationApi, /subscription_tier/)
})
