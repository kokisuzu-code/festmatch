import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')
const [authHomeRedirect, publicHome, vendorShell, organizerShell, marketingPage, marketingHome, marketingCss, authShell, editorPage, editorActions, schema] = await Promise.all([
  '../src/components/AuthHomeRedirect.tsx', '../src/app/(marketing)/home/page.tsx', '../src/components/VendorShell.tsx', '../src/components/OrganizerShell.tsx', '../src/app/(marketing)/page.tsx', '../src/app/(marketing)/MarketingHome.tsx', '../src/app/(marketing)/marketing.css', '../src/components/auth/AuthShell.tsx', '../src/app/admin/site/page.tsx', '../src/app/admin/site/actions.ts', '../supabase/migrations/20261104151056_editable_marketing.sql',
].map(read))

test('logged-in users can deliberately open the public home page', () => {
  assert.match(publicHome, /from '\.\.\/page'/)
  assert.match(authHomeRedirect, /pathname === '\/home'/)
})

test('portals keep the public link and only editors see the edit link', () => {
  assert.match(vendorShell, /href: '\/home', label: '公式HPを見る'/)
  assert.match(organizerShell, /href: '\/home', label: '公式HPを見る'/)
  assert.match(organizerShell, /canEditSite \? \[/)
  assert.match(organizerShell, /href: '\/admin\/site'/)
})

test('public homepage has direct search, event, signup and login paths', () => {
  assert.match(marketingPage, /site_published/)
  assert.match(marketingHome, /className="fm-home-login" href="\/login">ログイン/)
  assert.match(marketingHome, /action="\/festmap"/)
  assert.match(marketingHome, /href="\/signup\?role=organizer"/)
  assert.match(marketingHome, /href="\/signup\?role=vendor"/)
  assert.match(marketingHome, /content\.news\.length > 0/)
  assert.match(authShell, /href="\/home"/)
})

test('public photos are labelled as illustrations and layout responds to mobile', () => {
  assert.match(marketingHome, /写真はイメージです/)
  assert.match(marketingCss, /@media \(max-width: 600px\)/)
  assert.match(marketingCss, /fm-home-hero-card/)
})

test('site editor separates a private draft from published content', () => {
  assert.match(editorPage, /requireSiteEditor/)
  assert.match(editorActions, /requireSiteEditor/)
  assert.match(editorActions, /site_drafts/)
  assert.match(editorActions, /site_published/)
  assert.match(schema, /site_editors enable row level security/)
  assert.match(schema, /site_drafts enable row level security/)
  assert.match(schema, /site_published enable row level security/)
  assert.match(schema, /Everyone can read published homepage/)
  assert.doesNotMatch(schema, /Everyone can read drafts/)
})
