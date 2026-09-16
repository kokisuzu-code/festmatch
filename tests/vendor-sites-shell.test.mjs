import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const roleShell = await readFile(new URL('../src/components/RoleShell.tsx', import.meta.url), 'utf8')
const vendorShell = await readFile(new URL('../src/components/VendorShell.tsx', import.meta.url), 'utf8')
const globals = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8')

test('vendor routes use the migrated Sites shell', () => {
  assert.match(roleShell, /return <VendorShell>/)
  assert.doesNotMatch(roleShell, /vendor-theme/)
  assert.match(vendorShell, /organizer-console vendor-console/)
  assert.match(vendorShell, /\/vendor\/events/)
  assert.match(vendorShell, /\/vendor\/applications/)
  assert.match(vendorShell, /\/vendor\/messages/)
  assert.match(vendorShell, /\/vendor\/sales/)
  assert.match(vendorShell, /\/vendor\/settings/)
})

test('vendor shell keeps all navigation available on mobile', () => {
  assert.match(vendorShell, /mobileOpen/)
  assert.match(vendorShell, /メニューを開く/)
  assert.match(globals, /Vendor portal shell/)
  assert.match(globals, /\.vendor-console \.metric-grid/)
})
