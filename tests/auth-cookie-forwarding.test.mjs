import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const proxy = await readFile(new URL('../src/proxy.ts', import.meta.url), 'utf8')
const login = await readFile(new URL('../src/app/(auth)/login/page.tsx', import.meta.url), 'utf8')

test('auth redirects preserve Supabase cookie refreshes and removals', () => {
  assert.match(proxy, /function redirectWithAuthCookies/)
  assert.match(proxy, /authResponse\.cookies\.getAll\(\)\.forEach/)
  assert.doesNotMatch(proxy, /return NextResponse\.redirect/)
})

test('an invalid session redirects with a clear login message', () => {
  assert.match(proxy, /function isExpiredSessionError/)
  assert.match(proxy, /if \(isExpiredSessionError\(authError\)\) loginUrl\.searchParams\.set\('reason', 'session_expired'\)/)
  assert.match(login, /セッションの有効期限が切れました/)
})

test('protected routes return users to the requested page after login', () => {
  assert.match(proxy, /loginUrl\.searchParams\.set\('next', `\$\{pathname\}\$\{request\.nextUrl\.search\}`\)/)
  assert.match(login, /returnPath\(params\.get\("next"\)\)/)
})
