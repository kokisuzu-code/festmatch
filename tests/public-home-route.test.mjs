import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const authHomeRedirect = await readFile(new URL('../src/components/AuthHomeRedirect.tsx', import.meta.url), 'utf8')
const publicHome = await readFile(new URL('../src/app/(marketing)/home/page.tsx', import.meta.url), 'utf8')
const vendorShell = await readFile(new URL('../src/components/VendorShell.tsx', import.meta.url), 'utf8')
const organizerShell = await readFile(new URL('../src/components/OrganizerShell.tsx', import.meta.url), 'utf8')

test('logged-in users can deliberately open the public home page', () => {
  assert.match(publicHome, /from '\.\.\/page'/)
  assert.match(authHomeRedirect, /usePathname/)
  assert.match(authHomeRedirect, /pathname === '\/home'/)
  assert.match(authHomeRedirect, /\[pathname, router\]/)
})

test('role portals expose a link to the public home page', () => {
  assert.match(vendorShell, /href: '\/home', label: '公式HPを見る'/)
  assert.match(organizerShell, /href: '\/home', label: '公式HPを見る'/)
})
