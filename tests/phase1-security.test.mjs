import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(new URL('../supabase/migrations/20260720000500_remote_schema_baseline.sql', import.meta.url), 'utf8')
const signup = await readFile(new URL('../src/app/(auth)/signup/page.tsx', import.meta.url), 'utf8')
const callback = await readFile(new URL('../src/app/auth/callback/route.ts', import.meta.url), 'utf8')
const publicVendorPage = await readFile(new URL('../src/app/festmap/vendors/[slug]/page.tsx', import.meta.url), 'utf8')

test('Phase 1 keeps role assignment out of editable auth metadata', () => {
  assert.doesNotMatch(signup, /options:\s*\{[^}]*data:/s)
  assert.doesNotMatch(callback, /user_metadata/)
  assert.match(migration, /create policy profiles_update_own/)
  assert.match(migration, /with check \(\(id = auth\.uid\(\)\)\)/)
  assert.doesNotMatch(migration, /create policy profiles_insert/)
})

test('public vendor data is a narrow RLS-respecting projection', () => {
  assert.match(migration, /create or replace view public\.vendors_public with \(security_invoker = true\)/)
  assert.match(migration, /name,[\s\S]*slug,[\s\S]*genre,[\s\S]*photo_paths,[\s\S]*subscription_tier/)
  assert.doesNotMatch(migration.match(/create or replace view public\.vendors_public[\s\S]*?;\n\n/)?.[0] ?? '', /stripe_|profile_id|sales_records/)
  assert.match(publicVendorPage, /from\("vendors_public"\)/)
})

test('individual sales remain inaccessible to organizers', () => {
  assert.match(migration, /create policy sales_select_own/)
  assert.doesNotMatch(migration, /sales_records_[^\n]*organizer/i)
  assert.match(migration, /having count\(distinct s\.vendor_id\) >= 3/)
})
