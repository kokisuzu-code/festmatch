import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createClient } from '@supabase/supabase-js'

const enabled = process.env.RUN_REMOTE_SUPABASE_TESTS === '1'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function clientFor(email, password) {
  return createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    .auth.signInWithPassword({ email, password })
    .then(({ data, error }) => {
      assert.equal(error, null, `test user sign-in failed: ${error?.message ?? 'unknown error'}`)
      assert.ok(data.session, 'test user session is missing')
      return createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
      })
    })
}

async function createAuthUser(admin, email, password) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  assert.equal(error, null, `test user creation failed: ${error?.message ?? 'unknown error'}`)
  assert.ok(data.user, 'created test user is missing')
  return data.user
}

test('pending applications are inserted only from the server-only route', async () => {
  const pendingRoute = await readFile(new URL('../src/app/api/pending-applications/route.ts', import.meta.url), 'utf8')
  assert.match(pendingRoute, /createAdminClient\(\)/)
  assert.match(pendingRoute, /admin\.from\('pending_applications'\)\.insert/)
  assert.doesNotMatch(pendingRoute, /createClient\(/)
})

test('remote Supabase RLS protects private rows and exposes only safe public vendor data', { skip: !enabled }, async () => {
  assert.ok(url && anonKey && serviceRoleKey, 'remote test requires Supabase URL, anon/publishable key, and service-role key')
  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const suffix = randomUUID().replaceAll('-', '')
  const password = `Fm-${suffix.slice(0, 20)}!`
  const organizerEmail = `rls-organizer-${suffix}@example.invalid`
  const vendorAEmail = `rls-vendor-a-${suffix}@example.invalid`
  const vendorBEmail = `rls-vendor-b-${suffix}@example.invalid`
  const ids = { organizer: '', vendorA: '', vendorB: '', organizerRow: '', vendorARow: '', vendorBRow: '', event: '', draftEvent: '' }

  try {
    const [organizerUser, vendorAUser, vendorBUser] = await Promise.all([
      createAuthUser(admin, organizerEmail, password),
      createAuthUser(admin, vendorAEmail, password),
      createAuthUser(admin, vendorBEmail, password),
    ])
    ids.organizer = organizerUser.id
    ids.vendorA = vendorAUser.id
    ids.vendorB = vendorBUser.id

    const { error: profileError } = await admin.from('profiles').insert([
      { id: ids.organizer, role: 'organizer', display_name: 'RLS Organizer' },
      { id: ids.vendorA, role: 'vendor', display_name: 'RLS Vendor A' },
      { id: ids.vendorB, role: 'vendor', display_name: 'RLS Vendor B' },
    ])
    assert.equal(profileError, null, `profile setup failed: ${profileError?.message ?? 'unknown error'}`)

    const { data: organizer, error: organizerError } = await admin
      .from('organizers')
      .insert({ profile_id: ids.organizer, organization_name: 'RLS Organizer' })
      .select('id')
      .single()
    assert.equal(organizerError, null, `organizer setup failed: ${organizerError?.message ?? 'unknown error'}`)
    ids.organizerRow = organizer.id

    const { data: vendors, error: vendorsError } = await admin
      .from('vendors')
      .insert([
        { profile_id: ids.vendorA, name: 'RLS Vendor A', slug: `rls-a-${suffix.slice(0, 12)}`, genre: 'テスト', is_public: true, photo_paths: [] },
        { profile_id: ids.vendorB, name: 'RLS Vendor B', slug: `rls-b-${suffix.slice(0, 12)}`, genre: 'テスト', is_public: false, photo_paths: [] },
      ])
      .select('id, profile_id')
    assert.equal(vendorsError, null, `vendor setup failed: ${vendorsError?.message ?? 'unknown error'}`)
    ids.vendorARow = vendors.find((vendor) => vendor.profile_id === ids.vendorA)?.id ?? ''
    ids.vendorBRow = vendors.find((vendor) => vendor.profile_id === ids.vendorB)?.id ?? ''
    assert.ok(ids.vendorARow && ids.vendorBRow, 'vendor setup did not return both rows')

    const startsAt = new Date(Date.now() + 86_400_000)
    const endsAt = new Date(Date.now() + 172_800_000)
    const { data: event, error: eventError } = await admin
      .from('events')
      .insert({
        organizer_id: ids.organizerRow,
        title: 'RLS Test Event',
        slug: `rls-event-${suffix.slice(0, 12)}`,
        prefecture: '東京都',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        capacity: 10,
        booth_fee_yen: 0,
        status: 'published',
      })
      .select('id')
      .single()
    assert.equal(eventError, null, `event setup failed: ${eventError?.message ?? 'unknown error'}`)
    ids.event = event.id

    const { data: draftEvent, error: draftEventError } = await admin
      .from('events')
      .insert({
        organizer_id: ids.organizerRow,
        title: 'RLS Draft Event',
        slug: `rls-draft-${suffix.slice(0, 12)}`,
        prefecture: '東京都',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        capacity: 10,
        booth_fee_yen: 0,
        status: 'draft',
      })
      .select('id')
      .single()
    assert.equal(draftEventError, null, `draft event setup failed: ${draftEventError?.message ?? 'unknown error'}`)
    ids.draftEvent = draftEvent.id

    const [{ error: salesError }, { error: billingError }, { error: applicationError }] = await Promise.all([
      admin.from('sales_records').insert({ vendor_id: ids.vendorARow, event_id: ids.event, sales_date: startsAt.toISOString().slice(0, 10), gross_sales_yen: 1000, source: 'manual' }),
      admin.from('vendor_billing').insert({ vendor_id: ids.vendorARow, stripe_customer_id: `cus_rls_${suffix.slice(0, 14)}` }),
      admin.from('applications').insert({ vendor_id: ids.vendorARow, event_id: ids.event, status: 'approved' }),
    ])
    assert.equal(salesError, null, `sales setup failed: ${salesError?.message ?? 'unknown error'}`)
    assert.equal(billingError, null, `billing setup failed: ${billingError?.message ?? 'unknown error'}`)
    assert.equal(applicationError, null, `application setup failed: ${applicationError?.message ?? 'unknown error'}`)

    const [organizerClient, vendorAClient, vendorBClient] = await Promise.all([
      clientFor(organizerEmail, password),
      clientFor(vendorAEmail, password),
      clientFor(vendorBEmail, password),
    ])

    const blockedPublish = await organizerClient.from('events').update({ status: 'published' }).eq('id', ids.draftEvent)
    assert.notEqual(blockedPublish.error, null, 'an organizer without an active plan must not publish through the data API')
    const { error: activateOrganizerError } = await admin
      .from('organizers')
      .update({ billing_plan: 'annual', billing_status: 'active' })
      .eq('id', ids.organizerRow)
    assert.equal(activateOrganizerError, null, `organizer activation failed: ${activateOrganizerError?.message ?? 'unknown error'}`)
    const allowedPublish = await organizerClient.from('events').update({ status: 'published' }).eq('id', ids.draftEvent)
    assert.equal(allowedPublish.error, null, `an organizer with an active plan must publish: ${allowedPublish.error?.message ?? 'unknown error'}`)

    const [salesResult, billingResult, otherVendorResult, otherVendorBillingResult, ownSalesResult] = await Promise.all([
      organizerClient.from('sales_records').select('id').eq('vendor_id', ids.vendorARow),
      organizerClient.from('vendor_billing').select('vendor_id').eq('vendor_id', ids.vendorARow),
      vendorAClient.from('vendors').select('id').eq('id', ids.vendorBRow),
      vendorBClient.from('vendor_billing').select('vendor_id').eq('vendor_id', ids.vendorARow),
      vendorAClient.from('sales_records').select('id').eq('vendor_id', ids.vendorARow),
    ])
    assert.equal(salesResult.data?.length ?? 0, 0, 'organizer must not read individual vendor sales')
    assert.equal(billingResult.data?.length ?? 0, 0, 'organizer must not read vendor billing records')
    assert.equal(otherVendorResult.data?.length ?? 0, 0, 'one vendor must not read another vendor private row')
    assert.equal(otherVendorBillingResult.data?.length ?? 0, 0, 'one vendor must not read another vendor billing record')
    assert.equal(ownSalesResult.data?.length ?? 0, 1, 'a vendor must retain access to its own sales record')

    const anonymous = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const [publicVendorResult, pendingResult] = await Promise.all([
      anonymous.from('vendors_public').select('*').eq('id', ids.vendorARow).single(),
      anonymous.from('pending_applications').select('id').limit(1),
    ])
    assert.equal(publicVendorResult.error, null, `anon public vendor lookup failed: ${publicVendorResult.error?.message ?? 'unknown error'}`)
    assert.deepEqual(
      Object.keys(publicVendorResult.data).sort(),
      ['created_at', 'description', 'genre', 'id', 'instagram_url', 'name', 'photo_paths', 'prefecture', 'slug', 'subscription_tier', 'website_url'],
      'vendors_public must expose only its safe columns',
    )
    assert.equal(pendingResult.data?.length ?? 0, 0, 'anonymous clients must not read pending applications')

    const { data: buckets, error: bucketError } = await admin.storage.listBuckets()
    assert.equal(bucketError, null, `bucket lookup failed: ${bucketError?.message ?? 'unknown error'}`)
    const bucketNames = new Set((buckets ?? []).map((bucket) => bucket.name))
    assert.ok(bucketNames.has('vendor-photos'), 'vendor-photos bucket is missing')
    assert.ok(bucketNames.has('event-images'), 'event-images bucket is missing')
  } finally {
    if (ids.event) await admin.from('sales_records').delete().eq('event_id', ids.event)
    if (ids.event) await admin.from('applications').delete().eq('event_id', ids.event)
    if (ids.draftEvent) await admin.from('events').delete().eq('id', ids.draftEvent)
    if (ids.event) await admin.from('events').delete().eq('id', ids.event)
    if (ids.vendorARow || ids.vendorBRow) await admin.from('vendor_billing').delete().in('vendor_id', [ids.vendorARow, ids.vendorBRow].filter(Boolean))
    if (ids.vendorARow || ids.vendorBRow) await admin.from('vendors').delete().in('id', [ids.vendorARow, ids.vendorBRow].filter(Boolean))
    if (ids.organizerRow) await admin.from('organizers').delete().eq('id', ids.organizerRow)
    if (ids.organizer || ids.vendorA || ids.vendorB) await admin.from('profiles').delete().in('id', [ids.organizer, ids.vendorA, ids.vendorB].filter(Boolean))
    await Promise.all([ids.organizer, ids.vendorA, ids.vendorB].filter(Boolean).map((id) => admin.auth.admin.deleteUser(id)))
  }
})
