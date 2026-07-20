import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(new URL('../supabase/migrations/20260720000500_remote_schema_baseline.sql', import.meta.url), 'utf8')
const pendingApi = await readFile(new URL('../src/app/api/pending-applications/route.ts', import.meta.url), 'utf8')
const claimApi = await readFile(new URL('../src/app/api/claim/route.ts', import.meta.url), 'utf8')
const proxy = await readFile(new URL('../src/proxy.ts', import.meta.url), 'utf8')

test('Phase 5 stores only a hash of new anonymous-application claim tokens', () => {
  assert.match(migration, /claim_token_hash/)
  assert.match(migration, /alter table public\.pending_applications enable row level security/)
  assert.match(migration, /on table public\.pending_applications to service_role/)
  assert.match(pendingApi, /randomBytes\(32\)/)
  assert.match(pendingApi, /createHash\('sha256'\)/)
  assert.doesNotMatch(pendingApi, /select\("claim_token"/)
})

test('claim links are short lived, email-bound, and one-time', () => {
  assert.match(pendingApi, /24 \* 60 \* 60_000/)
  assert.match(pendingApi, /rateLimitSince/)
  assert.match(claimApi, /gt\('expires_at', now\)/)
  assert.match(claimApi, /pending\.email\.toLowerCase\(\) !== user\.email\.toLowerCase\(\)/)
  assert.match(claimApi, /is\('claimed_at', null\)/)
  assert.match(claimApi, /\.update\(\{ claimed_at: now \}\)/)
  assert.doesNotMatch(claimApi, /claimed_by/)
})

test('the embed CSP is derived from server configuration, not caller input', () => {
  assert.match(proxy, /FESTMATCH_EMBED_ALLOWED_ORIGINS/)
  assert.match(proxy, /frame-ancestors/)
  assert.doesNotMatch(proxy, /searchParams\.get\(['"]origin/)
  assert.doesNotMatch(proxy, /request\.headers\.get\(['"]referer/)
})
