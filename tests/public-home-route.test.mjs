import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const authHomeRedirect = await readFile(new URL('../src/components/AuthHomeRedirect.tsx', import.meta.url), 'utf8')
const publicHome = await readFile(new URL('../src/app/(marketing)/home/page.tsx', import.meta.url), 'utf8')
const vendorShell = await readFile(new URL('../src/components/VendorShell.tsx', import.meta.url), 'utf8')
const organizerShell = await readFile(new URL('../src/components/OrganizerShell.tsx', import.meta.url), 'utf8')
const marketingPage = await readFile(new URL('../src/app/(marketing)/page.tsx', import.meta.url), 'utf8')
const marketingCss = await readFile(new URL('../src/app/(marketing)/marketing.css', import.meta.url), 'utf8')
const scrollStory = await readFile(new URL('../src/app/(marketing)/FestMatchScrollStory.tsx', import.meta.url), 'utf8')
const authShell = await readFile(new URL('../src/components/auth/AuthShell.tsx', import.meta.url), 'utf8')

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

test('public and auth screens expose an explicit two-way login path', () => {
  assert.match(marketingPage, /className="fm-home-login" href="\/login">ログイン/)
  assert.match(authShell, /className=\{styles\.homeLink\} href="\/home"/)
  assert.match(authShell, /FestMatchトップへ戻る/)
})

test('public hero uses the compact, user-focused design', () => {
  assert.match(marketingPage, /週末が、近くなる。/)
  assert.match(marketingPage, /いつもの街にも、まだ知らない楽しみがある。/)
  assert.match(marketingPage, /fm-home-feature-main/)
  assert.doesNotMatch(marketingPage, /今日、近くで/)
  assert.match(marketingCss, /font-size: clamp\(2\.55rem, 4\.15vw, 3\.6rem\)/)
  assert.match(marketingCss, /white-space: nowrap/)
  assert.match(marketingCss, /font-weight: 700; line-height: 1\.18/)
  assert.match(marketingCss, /fm-home-feature-mini/)
  assert.doesNotMatch(marketingCss, /background-size: 115px 106px/)
})

test('public home tells a six-step weekend story with a sticky photo stage', () => {
  assert.match(marketingPage, /<FestMatchScrollStory \/>/)
  assert.match(scrollStory, /IntersectionObserver/)
  assert.match(scrollStory, /rootMargin: "-45% 0px -45% 0px"/)
  assert.match(scrollStory, /01 — A WEEKEND WITH FESTMATCH/)
  assert.equal((scrollStory.match(/time: "/g) ?? []).length, 6)
  assert.equal((scrollStory.match(/feature: "/g) ?? []).length, 3)
  assert.match(scrollStory, /discover-candid\.webp/)
  assert.match(scrollStory, /station-candid\.webp/)
  assert.match(scrollStory, /何も決めていない夜から、/)
  assert.match(scrollStory, /金曜の夜、ふと予定を探す。/)
  assert.doesNotMatch(scrollStory, /discover-at-home\.webp/)
  assert.doesNotMatch(scrollStory, /meet-at-station\.webp/)
  assert.match(marketingCss, /\.fm-story-stage \{ position: sticky; top: 0; height: 100svh;/)
  assert.match(marketingCss, /margin-top: -100svh/)
  assert.match(marketingCss, /\.fm-story-photo\.is-active \{ opacity: 1;/)
  assert.match(marketingCss, /overflow-x: clip/)
})
