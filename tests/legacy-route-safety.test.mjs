import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const legacyLayout = await readFile(new URL('../src/app/(dashboard)/layout.tsx', import.meta.url), 'utf8')
const devPage = await readFile(new URL('../src/app/dev/page.tsx', import.meta.url), 'utf8')
const developerPage = await readFile(new URL('../src/app/developer/page.tsx', import.meta.url), 'utf8')
const organizerPreview = await readFile(new URL('../src/app/developer/organizer/page.tsx', import.meta.url), 'utf8')
const vendorPreview = await readFile(new URL('../src/app/developer/vendor/page.tsx', import.meta.url), 'utf8')
const rolePreview = await readFile(new URL('../src/components/developer/RolePreview.tsx', import.meta.url), 'utf8')
const legacyCron = await readFile(new URL('../src/app/api/cron/check-slots/route.ts', import.meta.url), 'utf8')
const legacyNotification = await readFile(new URL('../src/app/api/notifications/broadcast/route.ts', import.meta.url), 'utf8')

test('legacy dashboard and development routes cannot become an alternate access path', () => {
  assert.match(legacyLayout, /redirectToRoleDashboard/)
  assert.match(devPage, /notFound\(\)/)
  assert.match(developerPage, /ログイン不要/)
  assert.doesNotMatch(developerPage, /getCurrentProfile|createClient|createAdminClient|requireRole/)
  assert.match(organizerPreview, /RolePreview role="organizer"/)
  assert.match(vendorPreview, /RolePreview role="vendor"/)
  assert.doesNotMatch(rolePreview, /getCurrentProfile|createClient|createAdminClient|requireRole|use server/)
})

test('retired automation endpoints return a route-level 410 response', () => {
  assert.match(legacyCron, /gone\(\)/)
  assert.match(legacyNotification, /gone\(\)/)
})
