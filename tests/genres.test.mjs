import test from 'node:test'
import assert from 'node:assert/strict'
import { VENDOR_GENRES, isVendorGenre, matchesRecruitingGenre } from '../src/lib/genres.ts'

test('vendor setup requires an explicit supported genre', () => {
  for (const genre of VENDOR_GENRES) assert.equal(isVendorGenre(genre), true)
  for (const genre of ['', ' ', 'unknown']) assert.equal(isVendorGenre(genre), false)
})

test('genre search excludes zero slots and preserves unrestricted events', () => {
  const slots = [{ genre: 'カレー・スパイス料理', capacity: 0 }, { genre: 'その他', capacity: 2 }]
  assert.equal(matchesRecruitingGenre(slots, 'カレー・スパイス料理'), false)
  assert.equal(matchesRecruitingGenre(slots, 'その他'), true)
  assert.equal(matchesRecruitingGenre(slots, 'コーヒー・ドリンク'), true)
  assert.equal(matchesRecruitingGenre(undefined, 'その他'), true)
  assert.equal(matchesRecruitingGenre(slots, ''), true)
})
