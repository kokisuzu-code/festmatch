import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const organizerShell = await readFile(new URL('../src/components/OrganizerShell.tsx', import.meta.url), 'utf8')
const vendorShell = await readFile(new URL('../src/components/VendorShell.tsx', import.meta.url), 'utf8')
const signoutRoute = await readFile(new URL('../src/app/auth/signout/route.ts', import.meta.url), 'utf8')

test('both dashboard logout controls post to the signout route', () => {
  assert.match(organizerShell, /<form action="\/auth\/signout"[^>]*method="post">/)
  assert.match(vendorShell, /<form action="\/auth\/signout"[^>]*method="post">/)
  assert.match(organizerShell, />\s*ログアウト\s*</)
  assert.match(vendorShell, />\s*ログアウト\s*</)
  assert.doesNotMatch(organizerShell, /<a href="\/auth\/signout">/)
  assert.doesNotMatch(vendorShell, /<a href="\/auth\/signout">/)
  assert.match(signoutRoute, /export async function POST/)
  assert.match(signoutRoute, /supabase\.auth\.signOut\(\)/)
  assert.match(signoutRoute, /NextResponse\.redirect\(`\$\{origin\}\/login`, 303\)/)
})
