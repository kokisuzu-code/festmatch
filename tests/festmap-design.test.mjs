import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { defaultDesign, designSchema, readFestMapDesign } from '../src/lib/site/festmap-design.ts'

test('FestMap design accepts existing defaults, bounds typography and validates color values', () => {
  assert.deepEqual(designSchema.parse(defaultDesign), defaultDesign)
  for (const patch of [{ desktop: 81 }, { mobile: 5 }, { color: 'red' }, { text: '' }]) {
    assert.equal(designSchema.safeParse({ ...defaultDesign, title: { ...defaultDesign.title, ...patch } }).success, false)
  }
  assert.deepEqual(readFestMapDesign(null), defaultDesign)
})

test('FestMap saves are isolated by page, protect drafts and reject stale publication', async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key);
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit int, allowed_mime_types text[]);
      create function auth.uid() returns uuid language sql stable as
        $$select current_setting('test.user_id',true)::uuid$$;
      create function public.is_platform_admin() returns boolean language sql stable as
        $$select current_setting('test.staff',true)='true'$$;
      grant usage on schema auth to authenticated;
    `)
    for (const name of ['20261104151056_editable_marketing','20261105000000_internal_site_editors_only','20261111011312_festmap_design_editor']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8'))
    }
    await db.exec(`
      insert into site_published(page,content) values('home','{"headline":"Home"}');
      insert into auth.users values ('00000000-0000-4000-8000-000000000001');
      insert into site_editors select id from auth.users;
      set role authenticated;
      set test.user_id = '00000000-0000-4000-8000-000000000001';
      set test.staff = 'true';
    `)
    const save = async (title, previous, publish) => (await db.query(
      'select save_festmap_design($1::jsonb,$2::timestamptz,$3)::text as version',
      [JSON.stringify({title}), previous, publish],
    )).rows[0].version
    const first = await save('Draft', null, false)
    await db.exec('set role anon')
    assert.deepEqual((await db.query('select page from site_published')).rows, [{ page: 'home' }])
    await assert.rejects(db.query('select * from site_drafts'), /permission denied/)
    await assert.rejects(save('Anonymous change', first, true), /permission denied/)
    await db.exec('set role authenticated')
    await save('Published', first, true)
    await assert.rejects(save('Stale', first, true), /Draft has changed/)
    await db.exec("set test.staff = 'false'")
    await assert.rejects(save('Unauthorized', null, true), /row-level security/)
    await db.exec('set role anon')
    const { rows } = await db.query('select page, content from site_published order by page')
    assert.deepEqual(rows, [{page:'festmap',content:{title:'Published'}}, {page:'home',content:{headline:'Home'}}])
  } finally { await db.close() }
})
