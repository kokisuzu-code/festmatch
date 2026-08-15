import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const login = await readFile(new URL('../src/app/(auth)/login/page.tsx', import.meta.url), 'utf8')
const signup = await readFile(new URL('../src/app/(auth)/signup/page.tsx', import.meta.url), 'utf8')
const forgot = await readFile(new URL('../src/app/(auth)/forgot-password/page.tsx', import.meta.url), 'utf8')
const reset = await readFile(new URL('../src/app/(auth)/reset-password/page.tsx', import.meta.url), 'utf8')
const callback = await readFile(new URL('../src/app/auth/callback/route.ts', import.meta.url), 'utf8')
const googleAuth = await readFile(new URL('../src/components/auth/GoogleAuthButton.tsx', import.meta.url), 'utf8')

test('email and password are the standard authentication flow', () => {
  assert.match(login, /signInWithPassword/)
  assert.doesNotMatch(login, /signInWithOtp/)
  assert.match(login, /claimToken\(params\.get\("claim"\)\)/)
  assert.match(login, /\/claim\?token=/)
  assert.match(signup, /auth\.signUp\(\{ email, password/)
  assert.match(signup, /minLength=\{12\}/)
})

test('Google OAuth returns through the trusted callback and preserves onboarding context', () => {
  assert.match(login, /GoogleAuthButton/)
  assert.match(signup, /GoogleAuthButton/)
  assert.match(googleAuth, /provider: 'google'/)
  assert.match(googleAuth, /window\.location\.origin\}\/auth\/callback/)
  assert.match(googleAuth, /query\.set\('claim', claim\)/)
  assert.match(callback, /exchangeCodeForSession/)
})

test('password recovery accepts only the internal reset destination', () => {
  assert.match(forgot, /resetPasswordForEmail/)
  assert.match(reset, /auth\.updateUser\(\{ password \}\)/)
  assert.match(forgot, /recoveryQuery\.set\("claim", claim\)/)
  assert.match(reset, /claimToken\(params\.get\("claim"\)\)/)
  assert.match(callback, /value === '\/reset-password'/)
  assert.doesNotMatch(callback, /NextResponse\.redirect\(`\$\{origin\}\$\{searchParams\.get\('next'\)/)
})
