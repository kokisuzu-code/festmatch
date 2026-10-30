import test from 'node:test'
import assert from 'node:assert/strict'
import { operationSchema, operationAllowed, csvCell, operationsCsv, toTokyoInput, fromTokyoInput } from '../src/lib/event-operations.ts'
import { eventSearchFilter } from '../src/lib/event-search.ts'
const uuid = '00000000-0000-4000-8000-000000000001'
const requestId = '00000000-0000-4000-8000-000000000002'

test('vendors cannot send broadcasts, alter a map, or claim organizer checks', () => {
  const announcement = operationSchema.parse({ command: 'announcement', requestId, payload: { body: 'Test', kind: 'notice', requires_ack: true } })
  assert.equal(operationAllowed('vendor', announcement), false)
  assert.equal(operationAllowed('organizer', announcement), true)
  for (const source of ['self', 'organizer']) {
    const check = operationSchema.parse({ command: 'check', requestId, payload: { application_id: uuid, kind: 'fire', source, state: 'checked', version: 0 } })
    assert.equal(operationAllowed('vendor', check), source === 'self')
  }
  assert.equal(operationAllowed('vendor', operationSchema.parse({ command: 'map', requestId, payload: { map_path: null, pins: [], confirmed: false, version: 0 } })), false)
})

test('updates require a valid version and reject identity/payment changes', () => {
  const input = { command: 'stall', requestId, payload: { application_id: uuid, status: 'open', version: 0 } }
  assert.equal(operationSchema.safeParse(input).success, true)
  for (const patch of [{ version: -1 }, { version: 0.5 }, { version: undefined }, { vendor_id: uuid }, { status: 'paid' }, { event_id: uuid }]) {
    assert.equal(operationSchema.safeParse({ ...input, payload: { ...input.payload, ...patch } }).success, false)
  }
})

test('map placement rejects duplicates, invalid coordinates and unknown commands', () => {
  const pin = { space_id: uuid, x: 20, y: 30 }
  const input = { command: 'map', requestId, payload: { map_path: null, pins: [pin], confirmed: false, version: 0 } }
  assert.equal(operationSchema.safeParse(input).success, true)
  for (const pins of [[pin, pin], [{ ...pin, x: -1 }], [{ ...pin, y: 101 }]]) assert.equal(operationSchema.safeParse({ ...input, payload: { ...input.payload, pins } }).success, false)
  assert.equal(operationSchema.safeParse({ ...input, command: 'settings' }).success, false)
})

test('Japan-time schedule values round-trip without host timezone shifts', () => {
  assert.equal(toTokyoInput('2026-11-07T00:30:00.000Z'), '2026-11-07T09:30')
  assert.equal(fromTokyoInput('2026-11-07T09:30'), '2026-11-07T00:30:00.000Z')
  assert.equal(toTokyoInput('2026-11-06T20:30:00.000Z'), '2026-11-07T05:30')
})

test('CSV download quotes multiline cells and prevents spreadsheet formulas', () => {
  assert.equal(csvCell('A,"B"\nC'), '"A,""B""\nC"')
  assert.equal(csvCell(' =SUM(1,2)'), '"\' =SUM(1,2)"')
  assert.equal(csvCell('@SUM(A1)'), '"\'@SUM(A1)"')
  const csv = operationsCsv({ event: { title: 'Test' }, applications: [{ id: uuid, name: 'テスト店', label: 'A-01', genre: '飲食' }], states: [{ application_id: uuid, status: 'loading' }], checks: [{ application_id: uuid, kind: 'fire', source: 'self', state: 'checked' }] })
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('"搬入中","0","6"'))
})

test('event searches cover location and cannot inject a PostgREST expression', () => {
  assert.equal(eventSearchFilter(' 横浜 '), 'title.ilike.%横浜%,address.ilike.%横浜%,prefecture.ilike.%横浜%,description.ilike.%横浜%')
  assert.equal(eventSearchFilter('   %_,()"'), null)
  const filter = eventSearchFilter('横浜),status.eq.draft,(title.ilike.%')
  assert.equal(filter.split(',').length, 4)
  assert.ok(!filter.includes('),'))
})
