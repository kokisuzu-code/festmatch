import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = await readFile(new URL("../supabase/migrations/20260720000500_remote_schema_baseline.sql", import.meta.url), "utf8")
const applicationApi = await readFile(new URL("../src/app/api/applications/route.ts", import.meta.url), "utf8")
const publicVendorPage = await readFile(new URL("../src/app/festmap/vendors/[slug]/page.tsx", import.meta.url), "utf8")
const proxy = await readFile(new URL("../src/proxy.ts", import.meta.url), "utf8")

test("sales privacy is structural, not an organizer policy on raw records", () => {
  assert.match(migration, /create or replace view public\.vendors_public/)
  assert.match(migration, /organizer_event_genre_stats/)
  assert.match(migration, /having count\(distinct s\.vendor_id\) >= 3/)
  assert.doesNotMatch(migration, /sales_records[^\n]*organizer/i)
  assert.match(migration, /create policy sales_select_own/)
})

test("event completion is computed rather than persisted", () => {
  assert.match(applicationApi, /event\?\.status !== 'published'/)
  assert.match(applicationApi, /isApplicationClosed\(event\)/)
})

test("free vendors can use the same application endpoint", () => {
  assert.match(applicationApi, /from\("vendors"\)/)
  assert.doesNotMatch(applicationApi, /subscription_tier/)
  assert.match(applicationApi, /from\("applications"\)\.insert/)
})

test("public vendor route is limited to the public view and embed CSP is dynamic", () => {
  assert.match(publicVendorPage, /from\("vendors_public"\)/)
  assert.doesNotMatch(publicVendorPage, /sales_records|stripe_/)
  assert.match(proxy, /FESTMATCH_EMBED_ALLOWED_ORIGINS/)
  assert.match(proxy, /frame-ancestors/)
})
