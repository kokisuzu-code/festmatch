import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const roleShell = await readFile(new URL('../src/components/RoleShell.tsx', import.meta.url), 'utf8')
const signoutRoute = await readFile(new URL('../src/app/auth/signout/route.ts', import.meta.url), 'utf8')

test('the shared dashboard logout control posts to the signout route', () => {
  assert.match(roleShell, /<form action="\/auth\/signout" method="post">/)
  assert.doesNotMatch(roleShell, /<a href="\/auth\/signout">/)
  assert.match(signoutRoute, /export async function POST/)
  assert.match(signoutRoute, /supabase\.auth\.signOut\(\)/)
})
