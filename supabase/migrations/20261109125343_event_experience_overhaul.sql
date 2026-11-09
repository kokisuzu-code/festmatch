-- Optional genre recruitment, shared booths, movable area markers and safe post-publication edits.
-- Existing registrations, assignments, bid history, ownership and RLS remain intact.
alter table public.event_spaces
  add column map_width numeric check (map_width between 2 and 25),
  add column map_height numeric check (map_height between 2 and 25);

create or replace function public.save_booth_config(p_event uuid,p_profile uuid,p_version integer,p_enabled boolean,p_map text,p_spaces jsonb,p_slots jsonb)
returns integer language plpgsql security invoker set search_path=public as $$
declare e public.events; s jsonb; new_version integer;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'not allowed'; end if;
 select * into e from public.events where id=p_event for update;
 if e.id is null or not exists(select 1 from public.organizers where id=e.organizer_id and profile_id=p_profile) then raise exception 'not allowed'; end if;
 if e.booth_config_version<>p_version then raise exception '設定が更新されています。再読み込みしてください。'; end if;
 if exists(select 1 from public.booth_bids where event_id=p_event) or exists(select 1 from public.applications where event_id=p_event) then raise exception '応募受付後は区画・募集条件を変更できません。'; end if;
 if jsonb_typeof(p_spaces)<>'array' or jsonb_array_length(p_spaces)>100 or jsonb_typeof(p_slots)<>'array' or jsonb_array_length(p_slots)>100 then raise exception '区画の内容を確認してください。'; end if;
 if p_map is not null and p_map is distinct from e.booth_map_path and (p_map not like p_event::text||'/booth-map-%' or not exists(select 1 from storage.objects where bucket_id='event-images' and name=p_map)) then raise exception 'このイベントの区画図を添付してください。'; end if;
 if jsonb_array_length(p_spaces)>0 and p_map is null then raise exception '区画図の添付が必要です。'; end if;
 if p_enabled then
   if e.application_deadline_at is null or e.application_deadline_at >= e.starts_at then raise exception '入札募集には開催開始前の応募締切が必要です。'; end if;
   if p_map is null then raise exception '区画図の画像添付が必要です。'; end if;
   if jsonb_array_length(p_spaces)=0 then raise exception '区画を1つ以上設定してください。'; end if;
 end if;
 -- Atomic replacement, including genre caps. IDs are regenerated only before any bids exist.
 delete from public.event_spaces where event_id=p_event;
 delete from public.event_genre_slots where event_id=p_event;
 for s in select * from jsonb_array_elements(p_slots) loop
   if coalesce(btrim(s->>'genre'),'')='' or length(s->>'genre')>100 or (s->>'capacity')::numeric<>trunc((s->>'capacity')::numeric) or (s->>'capacity')::integer not between 0 and 1000 then raise exception 'ジャンル枠を確認してください。'; end if;
   insert into public.event_genre_slots(event_id,genre,capacity) values(p_event,btrim(s->>'genre'),(s->>'capacity')::integer);
 end loop;
 for s in select * from jsonb_array_elements(p_spaces) loop
   if coalesce(btrim(s->>'label'),'')='' or length(s->>'label')>80 or (s->>'genre' is not null and not exists(select 1 from public.event_genre_slots where event_id=p_event and genre=s->>'genre')) or (s->>'minimum_fee_yen')::numeric<>trunc((s->>'minimum_fee_yen')::numeric) or (s->>'minimum_fee_yen')::integer not between 1000 and 1000000 or (s->>'minimum_fee_yen')::integer % 1000<>0 or (s->>'map_x')::numeric not between 0 and 100 or (s->>'map_y')::numeric not between 0 and 100 or s->>'map_x' is null or s->>'map_y' is null or s->>'minimum_fee_yen' is null then raise exception '区画の番号・ジャンル・最低額・位置を確認してください。'; end if;
   if exists(select 1 from public.event_spaces where event_id=p_event and label=btrim(s->>'label')) then raise exception '区画番号が重複しています。'; end if;
   insert into public.event_spaces(event_id,label,genre,minimum_fee_yen,map_x,map_y,map_width,map_height) values(p_event,btrim(s->>'label'),s->>'genre',(s->>'minimum_fee_yen')::integer,(s->>'map_x')::numeric,(s->>'map_y')::numeric,coalesce((s->>'map_width')::numeric,7),coalesce((s->>'map_height')::numeric,7));
 end loop;
 if e.capacity is not null and (select coalesce(sum(capacity),0) from public.event_genre_slots where event_id=p_event)>e.capacity then raise exception 'ジャンル枠の合計はイベント全体の定員以下にしてください。'; end if;
 update public.events set booth_bidding_enabled=p_enabled,booth_map_path=p_map,booth_config_version=booth_config_version+1 where id=p_event returning booth_config_version into new_version;
 return new_version;
end $$;

create or replace function public.submit_booth_bid(p_event uuid,p_profile uuid,p_amount integer,p_preferences uuid[],p_message text,p_version integer)
returns public.booth_bids language plpgsql security invoker set search_path=public as $$
declare e public.events; v public.vendors; old_bid public.booth_bids; result public.booth_bids; g text;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'not allowed'; end if;
 select * into e from public.events where id=p_event for update;
 if e.id is null or not e.booth_bidding_enabled or e.status<>'published' or e.booth_bidding_finalized_at is not null or e.application_deadline_at is null or now()>=e.application_deadline_at or now()>=e.starts_at then raise exception '入札受付は終了しているか、公開されていません。'; end if;
 select * into v from public.vendors where profile_id=p_profile;
 if v.id is null then raise exception '出店者プロフィールを登録してください。'; end if;
 select * into old_bid from public.booth_bids where event_id=p_event and vendor_id=v.id;
 if coalesce(old_bid.version,0)<>p_version then raise exception '応募が更新されています。再読み込みしてください。'; end if;
 if exists(select 1 from public.applications where event_id=p_event and vendor_id=v.id) then raise exception 'すでに正式応募があります。'; end if;
 g:=coalesce(old_bid.genre,v.genre);
 if exists(select 1 from public.event_genre_slots where event_id=p_event) and not exists(select 1 from public.event_genre_slots where event_id=p_event and genre=g and capacity>0) then raise exception 'このジャンルは募集していません。'; end if;
 if p_amount is null or p_amount not between 1000 and 1000000 or p_amount%1000<>0 or p_amount<old_bid.amount_yen then raise exception '提示額は1,000円単位で設定し、引き下げはできません。'; end if;
 if p_preferences is null or cardinality(p_preferences) not between 1 and 3 or cardinality(p_preferences)<>(select count(distinct x) from unnest(p_preferences) x) or exists(select 1 from unnest(p_preferences) x where not exists(select 1 from public.event_spaces s where s.id=x and s.event_id=p_event and (s.genre is null or s.genre=g) and s.minimum_fee_yen<=p_amount and s.map_x is not null and s.map_y is not null)) then raise exception '希望区画のジャンル・最低額を確認してください。'; end if;
 if length(coalesce(p_message,''))>2000 then raise exception 'メッセージは2,000文字以内です。'; end if;
 if old_bid.id is null then
  insert into public.booth_bids(event_id,vendor_id,genre,amount_yen,preferences,message) values(p_event,v.id,g,p_amount,p_preferences,p_message) returning * into result;
 else
  update public.booth_bids set amount_yen=p_amount,amount_submitted_at=case when p_amount>old_bid.amount_yen then clock_timestamp() else old_bid.amount_submitted_at end,preferences=p_preferences,message=p_message,version=version+1 where id=old_bid.id returning * into result;
 end if;
 insert into public.booth_bid_history(bid_id,amount_yen,amount_submitted_at,preferences,version) values(result.id,result.amount_yen,result.amount_submitted_at,result.preferences,result.version);
 return result;
end $$;

create or replace function public.finalize_booth_bids(p_event uuid,p_profile uuid,p_expected text)
returns integer language plpgsql security invoker set search_path=public as $$
declare e public.events; b public.booth_bids; target public.event_spaces; app_id uuid; used integer; cap integer; approved integer:=0; fingerprint text;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'not allowed'; end if;
 select * into e from public.events where id=p_event for update;
 if e.id is null or not exists(select 1 from public.organizers where id=e.organizer_id and profile_id=p_profile) then raise exception 'not allowed'; end if;
 if not e.booth_bidding_enabled or e.status<>'published' or e.application_deadline_at is null or now()<e.application_deadline_at or now()>=e.ends_at then raise exception '締切後・開催終了前に割当を確定できます。'; end if;
 if e.booth_bidding_finalized_at is not null then raise exception '割当はすでに確定しています。'; end if;
 select coalesce(string_agg(id::text||':'||version::text,',' order by id),'') into fingerprint from public.booth_bids where event_id=p_event;
 if fingerprint is distinct from p_expected then raise exception '応募が更新されています。結果を再確認してください。'; end if;
 if exists(select 1 from public.applications where event_id=p_event) or exists(select 1 from public.event_spaces where event_id=p_event and assigned_application_id is not null) then raise exception '既存の正式応募・割当を確認してください。'; end if;
 for b in select * from public.booth_bids where event_id=p_event order by amount_yen desc,amount_submitted_at,id loop
  select capacity into cap from public.event_genre_slots where event_id=p_event and genre=b.genre;
  select count(*) into used from public.applications where event_id=p_event and vendor_genre_snapshot=b.genre and status in ('approved','paid');
  target:=null;
  if (used<cap or (cap is null and not exists(select 1 from public.event_genre_slots where event_id=p_event))) and (e.capacity is null or approved<e.capacity) then
   select s.* into target from unnest(b.preferences) with ordinality p(id,ord) join public.event_spaces s on s.id=p.id where s.event_id=p_event and (s.genre is null or s.genre=b.genre) and s.minimum_fee_yen<=b.amount_yen and s.assigned_application_id is null order by p.ord limit 1;
  end if;
  if target.id is not null then
   insert into public.applications(event_id,vendor_id,message,booth_bid_id,booth_fee_yen_snapshot) values(p_event,b.vendor_id,b.message,b.id,b.amount_yen) returning id into app_id;
   -- Preserve the genre at bid time even if the profile changed before close.
   update public.applications set vendor_genre_snapshot=b.genre,status='approved' where id=app_id;
   update public.event_spaces set assigned_application_id=app_id where id=target.id;
   update public.booth_bids set status='awarded',application_id=app_id where id=b.id;
   approved:=approved+1;
  else
   update public.booth_bids set status='waitlisted' where id=b.id;
  end if;
 end loop;
 update public.events set booth_bidding_finalized_at=clock_timestamp() where id=p_event;
 return approved;
end $$;

create or replace function public.guard_booth_config() returns trigger language plpgsql security definer set search_path=public as $$
declare event_uuid uuid; e public.events; has_bids boolean;
begin
 event_uuid:=case when tg_table_name='events' then (case when tg_op='DELETE' then to_jsonb(old)->>'id' else to_jsonb(new)->>'id' end)::uuid else (case when tg_op='DELETE' then to_jsonb(old)->>'event_id' else to_jsonb(new)->>'event_id' end)::uuid end;
 select * into e from public.events where id=event_uuid for update;
 select exists(select 1 from public.booth_bids where event_id=event_uuid) or exists(select 1 from public.applications where event_id=event_uuid) into has_bids;
 if tg_table_name='events' then
  if tg_op='UPDATE' and has_bids and (new.booth_bidding_enabled is distinct from old.booth_bidding_enabled or new.booth_map_path is distinct from old.booth_map_path or new.application_deadline_at is distinct from old.application_deadline_at or new.capacity is distinct from old.capacity or new.booth_fee_yen is distinct from old.booth_fee_yen or new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at or new.status is distinct from old.status) then raise exception '応募受付後は募集条件を変更できません。'; end if;
  if tg_op='UPDATE' and new.booth_bidding_finalized_at is distinct from old.booth_bidding_finalized_at and coalesce(auth.role(),'')<>'service_role' then raise exception 'not allowed'; end if;
  if new.booth_bidding_enabled and new.status='published' then
   if new.capacity is not null and (select coalesce(sum(capacity),0) from public.event_genre_slots where event_id=new.id)>new.capacity then raise exception 'ジャンル枠の合計は全体定員以下にしてください。'; end if;
   if new.application_deadline_at is null or new.application_deadline_at>=new.starts_at or new.booth_map_path is null or (not exists(select 1 from storage.objects where bucket_id='event-images' and name=new.booth_map_path) and new.booth_map_path !~ '^/event-maps/[a-z0-9-]+\.(png|webp)$') or not exists(select 1 from public.event_spaces where event_id=new.id) or exists(select 1 from public.event_spaces s where s.event_id=new.id and (s.map_x is null or s.map_y is null or s.minimum_fee_yen<1000 or (s.genre is not null and not exists(select 1 from public.event_genre_slots g where g.event_id=new.id and g.genre=s.genre)))) then raise exception '区画図・締切・区画位置・最低額・ジャンル枠を設定してください。'; end if;
  end if;
 else
  if tg_op='UPDATE' and new.event_id is distinct from old.event_id then raise exception '区画・枠のイベントは変更できません。'; end if;
  if has_bids then
   if tg_op<>'UPDATE' then raise exception '応募受付後は募集条件を変更できません。'; end if;
   if tg_table_name='event_genre_slots' then
    if new.genre is distinct from old.genre or new.capacity is distinct from old.capacity then raise exception '応募受付後はジャンル枠を変更できません。'; end if;
   else
    if new.label is distinct from old.label or new.genre is distinct from old.genre or new.minimum_fee_yen is distinct from old.minimum_fee_yen or new.map_x is distinct from old.map_x or new.map_y is distinct from old.map_y or new.map_width is distinct from old.map_width or new.map_height is distinct from old.map_height then raise exception '応募受付後は区画条件を変更できません。'; end if;
    if new.assigned_application_id is distinct from old.assigned_application_id and coalesce(auth.role(),'')<>'service_role' then raise exception '入札募集の区画は割当確定で設定します。'; end if;
   end if;
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;

-- Trigger helper is not an API. Service-only invoker RPC grants are retained by CREATE OR REPLACE.
revoke all on function public.guard_booth_config() from public, anon, authenticated;
