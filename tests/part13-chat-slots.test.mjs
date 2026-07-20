import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const chatActions = await readFile(new URL('../src/app/chat/actions.ts', import.meta.url), 'utf8')
const organizerActions = await readFile(new URL('../src/app/organizer/events/actions.ts', import.meta.url), 'utf8')
const applicationApi = await readFile(new URL('../src/app/api/applications/route.ts', import.meta.url), 'utf8')
const organizerDecision = await readFile(new URL('../src/components/organizer/ApplicationDecision.tsx', import.meta.url), 'utf8')
const vendorChat = await readFile(new URL('../src/app/vendor/messages/[threadId]/page.tsx', import.meta.url), 'utf8')
const vendorApplications = await readFile(new URL('../src/app/vendor/applications/page.tsx', import.meta.url), 'utf8')

test('Part 13 only opens direct chats for an accepted application', () => {
  assert.match(chatActions, /const acceptedApplicationStatuses = \['approved', 'paid'\]/)
  assert.match(chatActions, /async function requireAcceptedApplication/)
  assert.match(chatActions, /await requireAcceptedApplication\(eventId, vendorId, session\.supabase\)/)
  assert.match(chatActions, /type: 'direct'/)
})

test('Part 13 keeps broadcast posting organizer-only in the server action and vendor UI', () => {
  assert.match(chatActions, /if \(thread\.type === 'broadcast'\) \{[\s\S]*session\.profile\.role !== 'organizer'/)
  assert.match(chatActions, /await requireOrganizerEvent\(thread\.event_id\)/)
  assert.match(vendorChat, /canPost=\{!isBroadcast\}/)
})

test('Part 13 blocks full genre slots before application and approval', () => {
  assert.match(applicationApi, /getGenreSlotAvailability\(\[event\.id\]\)/)
  assert.match(applicationApi, /matchingSlot\?\.isFull/)
  assert.match(organizerActions, /slot\.genre === application\.vendor_genre_snapshot/)
  assert.match(organizerActions, /used >= matchingSlot\.capacity/)
  assert.match(organizerDecision, /genreSlotFull/)
})

test('Part 13 keeps a space assignment unique and only exposes it to the assigned vendor view', () => {
  assert.match(organizerActions, /assigned_application_id: application\.id/)
  assert.match(organizerActions, /\.is\('assigned_application_id', null\)/)
  assert.match(organizerActions, /assigned_application_id: null/)
  assert.match(vendorApplications, /from\('event_spaces'\)/)
  assert.match(vendorApplications, /\.in\('assigned_application_id', applicationIds\)/)
})
