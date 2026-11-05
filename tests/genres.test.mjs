import test from 'node:test'
import assert from 'node:assert/strict'
import { VENDOR_GENRES, isVendorGenre, matchesRecruitingGenre, defaultGenreSlots, completeGenreSlots } from '../src/lib/genres.ts'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'

test('vendor setup requires an explicit supported genre', () => {
  for (const genre of VENDOR_GENRES) assert.equal(isVendorGenre(genre), true)
  for (const genre of ['', ' ', 'unknown', null, undefined, ['その他'], 'タコス・タコライス']) assert.equal(isVendorGenre(genre), false)
})

test('expanded recruitment categories preserve existing capacities and leave new categories closed', () => {
  const defaults = defaultGenreSlots()
  assert.equal(defaults.reduce((sum, slot) => sum + slot.capacity, 0), 10)
  assert.equal(defaults.find(slot => slot.genre === 'バーガー・サンドイッチ').capacity, 0)
  const current = [{ id: 'saved', genre: 'タコス・メキシカン', capacity: 3 }]
  const completed = completeGenreSlots(current)
  assert.deepEqual(completed.find(slot => slot.genre === current[0].genre), current[0])
  assert.equal(completed.reduce((sum, slot) => sum + slot.capacity, 0), 3)
  assert.equal(current.length, 1)
})

test('database rejects custom or missing primary genres while allowing unrestricted regular spaces', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create table vendors(genre text not null);
      create table event_genre_slots(genre text not null);
      create table event_spaces(genre text);
      create table booth_bids(genre text not null);`)
    const migrations = new URL('../supabase/migrations/', import.meta.url)
    const name = readdirSync(migrations).find(name => name.endsWith('_unified_vendor_genres.sql'))
    await db.exec(readFileSync(new URL(name, migrations), 'utf8'))
    for (const table of ['vendors', 'event_genre_slots', 'event_spaces', 'booth_bids']) {
      for (const genre of VENDOR_GENRES) await db.query(`insert into ${table}(genre) values($1)`, [genre])
      for (const genre of ['', '未設定', '自由入力', 'タコス・タコライス']) {
        await assert.rejects(db.query(`insert into ${table}(genre) values($1)`, [genre]), /check constraint/)
      }
    }
    await assert.rejects(db.query('insert into vendors(genre) values(null)'), /not-null/)
    await db.query('insert into event_spaces(genre) values(null)')
  } finally { await db.close() }
})

test('genre search excludes zero slots and preserves unrestricted events', () => {
  const slots = [{ genre: 'カレー・スパイス料理', capacity: 0 }, { genre: 'その他', capacity: 2 }]
  assert.equal(matchesRecruitingGenre(slots, 'カレー・スパイス料理'), false)
  assert.equal(matchesRecruitingGenre(slots, 'その他'), true)
  assert.equal(matchesRecruitingGenre(slots, 'コーヒー・ドリンク'), true)
  assert.equal(matchesRecruitingGenre(undefined, 'その他'), true)
  assert.equal(matchesRecruitingGenre(slots, ''), true)
})
