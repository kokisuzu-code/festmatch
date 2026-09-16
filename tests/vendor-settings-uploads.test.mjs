import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const settingsPage = await readFile(new URL('../src/app/vendor/settings/page.tsx', import.meta.url), 'utf8')
const profileForm = await readFile(new URL('../src/components/vendor/VendorProfileForm.tsx', import.meta.url), 'utf8')
const settingsAction = await readFile(new URL('../src/app/vendor/settings/actions.ts', import.meta.url), 'utf8')

test('vendor settings uses direct image attachments instead of editable storage paths', () => {
  assert.match(settingsPage, /<VendorProfileForm/)
  assert.doesNotMatch(settingsPage, /写真パス（1行に1つ）/)
  assert.match(profileForm, /type="file" accept="image\/\*" multiple/)
  assert.match(profileForm, /capture="environment"/)
  assert.match(profileForm, /onDrop=\{handleDrop\}/)
})

test('vendor photos upload to the authenticated vendor folder and keep their display order', () => {
  assert.match(profileForm, /from\('vendor-photos'\)/)
  assert.match(profileForm, /return `\$\{vendorId\}\/profile\//)
  assert.match(profileForm, /upsert: false/)
  assert.match(profileForm, /finalPaths\.push/)
  assert.match(profileForm, /movePhoto\(index, -1\)/)
  assert.match(profileForm, /movePhoto\(index, 1\)/)
})

test('the server action rejects foreign paths and removes photos taken out of the profile', () => {
  assert.match(settingsAction, /path\.startsWith\(`\$\{vendorId\}\//)
  assert.match(settingsAction, /!path\.includes\('\.\.'\)/)
  assert.match(settingsAction, /removedPhotoPaths/)
  assert.match(settingsAction, /storage\.from\('vendor-photos'\)\.remove\(removedPhotoPaths\)/)
})
