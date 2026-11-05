import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
test('Postgres enforces bid ownership, timestamps, deadline, caps and atomic allocation', async () => {
const db=new PGlite()
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.organizers(id uuid primary key default gen_random_uuid(),profile_id uuid);
create table public.vendors(id uuid primary key default gen_random_uuid(),profile_id uuid,genre text);
create table public.events(id uuid primary key default gen_random_uuid(),organizer_id uuid references organizers,status text default 'draft',application_deadline_at timestamptz,starts_at timestamptz,ends_at timestamptz,capacity integer);
create table public.applications(id uuid primary key default gen_random_uuid(),event_id uuid references events,vendor_id uuid references vendors,message text,status text default 'pending',vendor_genre_snapshot text,booth_fee_yen_snapshot integer,approved_at timestamptz,rejected_at timestamptz,paid_at timestamptz,unique(event_id,vendor_id));
create table public.event_genre_slots(id uuid primary key default gen_random_uuid(),event_id uuid references events,genre text,capacity integer check(capacity>=0),unique(event_id,genre));
create table public.event_spaces(id uuid primary key default gen_random_uuid(),event_id uuid references events,label text,genre text,assigned_application_id uuid unique references applications);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
create function public.my_vendor_id() returns uuid language sql stable security definer as $$select id from public.vendors where profile_id=auth.uid()$$;
create function public.my_organizer_id() returns uuid language sql stable security definer as $$select id from public.organizers where profile_id=auth.uid()$$;
grant usage on schema public,auth,storage to service_role,authenticated;
grant all on all tables in schema public,storage to service_role;
`)
const migration=readFileSync(new URL('../supabase/migrations/20261105115027_booth_bidding_integration.sql',import.meta.url),'utf8')
await db.exec(migration)
await db.exec('create trigger trg_application_rules before insert or update on applications for each row execute function public.enforce_application_rules()')
const profile='00000000-0000-4000-8000-000000000001',o='00000000-0000-4000-8000-000000000002',e='00000000-0000-4000-8000-000000000003'
const vendors=[1,2,3,4].map(n=>({id:`10000000-0000-4000-8000-00000000000${n}`,profile:`20000000-0000-4000-8000-00000000000${n}`}))
await db.query(`insert into organizers(id,profile_id) values($1,$2)`,[o,profile])
await db.query(`insert into events(id,organizer_id,starts_at,ends_at,application_deadline_at,capacity) values($1,$2,now()+interval '5 days',now()+interval '6 days',now()+interval '1 day',3)`,[e,o])
for (const v of vendors) await db.query('insert into vendors(id,profile_id,genre) values($1,$2,$3)',[v.id,v.profile,'フード'])
await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['event-images',e+'/booth-map-test.png'])
await db.exec("set request.jwt.claim.role='service_role'")
const spaces=[1,2,3].map(n=>({label:'A'+n,genre:'フード',minimum_fee_yen:20000,map_x:n*20,map_y:30}))
await db.query('select save_booth_config($1,$2,0,true,$3,$4::jsonb,$5::jsonb)',[e,profile,e+'/booth-map-test.png',JSON.stringify(spaces),JSON.stringify([{genre:'フード',capacity:3}])])
await db.query("update events set status='published' where id=$1",[e])
const ss=(await db.query('select id from event_spaces order by label')).rows.map(r=>r.id)
const bid=async(n,amount,prefs=ss,version=0)=>(await db.query('select * from submit_booth_bid($1,$2,$3,$4::uuid[],null,$5)',[e,vendors[n].profile,amount,prefs,version])).rows[0]
const first=await bid(0,35000),earlyLow=await bid(1,25000),later=await bid(1,35000,ss,earlyLow.version),highest=await bid(2,42000)
assert.ok(Date.parse(first.amount_submitted_at)<=Date.parse(later.amount_submitted_at))
const unchanged=await bid(0,35000,[ss[1],ss[0]],first.version)
assert.equal(String(unchanged.amount_submitted_at),String(first.amount_submitted_at))
async function rejects(fn,pattern){await assert.rejects(fn,pattern)}
await rejects(()=>bid(0,34000,ss,unchanged.version),/引き下げ/)
await rejects(()=>bid(0,36000,ss,1),/更新されています/)
await rejects(()=>bid(3,35000,[ss[0],ss[0]]),/希望区画/)
await rejects(()=>bid(3,19000),/希望区画/)
await rejects(()=>db.query('select save_booth_config($1,$2,1,true,$3,$4::jsonb,$5::jsonb)',[e,profile,e+'/booth-map-test.png',JSON.stringify(spaces),'[]']),/応募受付後/)
await rejects(()=>db.query('update event_genre_slots set capacity=5 where event_id=$1',[e]),/応募受付後/)
await rejects(()=>db.query('select finalize_booth_bids($1,$2,\'\')',[e,profile]),/締切後/)
await db.exec("grant select on public.events to authenticated; set role authenticated; set request.jwt.claim.role='authenticated'")
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[vendors[0].profile])
assert.equal((await db.query('select * from booth_bids')).rows.length,1)
assert.equal((await db.query('select * from booth_bid_history')).rows.length,2)
await rejects(()=>db.query('update booth_bids set amount_yen=999000'),/permission denied/)
await rejects(()=>db.query('select * from submit_booth_bid($1,$2,45000,$3::uuid[],null,0)',[e,vendors[3].profile,ss]),/permission denied/)
await db.exec("reset role; set request.jwt.claim.role='authenticated'")
await rejects(()=>bid(3,45000),/not allowed/)
await rejects(()=>db.query("insert into applications(event_id,vendor_id) values($1,$2)",[e,vendors[3].id]),/区画応募画面/)
// Freeze is intentional: move the database clock in the fixture by replacing the
// event timestamps under a disabled trigger, not through any production API.
await db.exec("set request.jwt.claim.role='service_role'; alter table events disable trigger guard_booth_event")
await db.query("update events set application_deadline_at=now()-interval '1 second' where id=$1",[e])
await db.exec('alter table events enable trigger guard_booth_event')
await rejects(()=>bid(3,45000),/入札受付/)
const fp=(await db.query("select string_agg(id::text||':'||version::text,',' order by id) as fp from booth_bids")).rows[0].fp
await rejects(()=>db.query('select finalize_booth_bids($1,$2,$3)',[e,profile,'stale']),/更新されています/)
await rejects(()=>db.query('select finalize_booth_bids($1,$2,$3)',[e,vendors[0].profile,fp]),/not allowed/)
// Vendor profile change must not change the genre captured by the bid.
await db.query('update vendors set genre=$1 where id=$2',['スイーツ',vendors[0].id])
const final=(await db.query('select finalize_booth_bids($1,$2,$3) as n',[e,profile,fp])).rows[0]
assert.equal(final.n,3)
const accepted=(await db.query('select a.*,s.label from applications a join event_spaces s on s.assigned_application_id=a.id order by booth_fee_yen_snapshot desc,approved_at')).rows
assert.equal(accepted.length,3)
assert.equal(accepted.find(a=>a.vendor_id===vendors[2].id).label,'A1')
assert.equal(accepted.find(a=>a.vendor_id===vendors[0].id).label,'A2')
assert.equal(accepted.find(a=>a.vendor_id===vendors[1].id).label,'A3')
assert.equal(accepted.find(a=>a.vendor_id===vendors[0].id).vendor_genre_snapshot,'フード')
assert.ok(accepted.every(a=>a.status==='approved'&&a.booth_fee_yen_snapshot>=35000))
await rejects(()=>db.query('select finalize_booth_bids($1,$2,$3)',[e,profile,fp]),/すでに確定/)
console.log('PASS: full migration, configuration, timestamp preservation/reset, stale versions, minimum/genre/duplicates, freeze guards, deadline, owner checks, atomic finalize, snapshot fees and no repeated finalization')
await db.close()

})
