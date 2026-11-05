alter table public.events
  add column booth_bidding_enabled boolean not null default false,
  add column booth_map_path text,
  add column booth_bidding_finalized_at timestamptz,
  add column booth_config_version integer not null default 0;
alter table public.event_spaces
  add column minimum_fee_yen integer not null default 0 check (minimum_fee_yen between 0 and 1000000),
  add column map_x numeric check (map_x between 0 and 100),
  add column map_y numeric check (map_y between 0 and 100);

create table public.booth_bids (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  vendor_id uuid not null references public.vendors on delete cascade,
  genre text not null,
  amount_yen integer not null check (amount_yen between 1000 and 1000000 and amount_yen % 1000 = 0),
  amount_submitted_at timestamptz not null default clock_timestamp(),
  preferences uuid[] not null check (cardinality(preferences) between 1 and 3 and array_position(preferences,null) is null),
  message text check (length(message) <= 2000),
  status text not null default 'pending' check (status in ('pending','awarded','waitlisted')),
  application_id uuid unique references public.applications on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  unique(event_id,vendor_id)
);
alter table public.applications add column booth_bid_id uuid unique references public.booth_bids;
create table public.booth_bid_history (
  id bigint generated always as identity primary key,
  bid_id uuid not null references public.booth_bids on delete cascade,
  amount_yen integer not null,
  amount_submitted_at timestamptz not null,
  preferences uuid[] not null,
  version integer not null,
  recorded_at timestamptz not null default clock_timestamp()
);
create index booth_bids_ranking on public.booth_bids(event_id,genre,amount_yen desc,amount_submitted_at,id);
alter table public.booth_bids enable row level security;
alter table public.booth_bid_history enable row level security;
create policy booth_bids_read_parties on public.booth_bids for select to authenticated
 using (vendor_id = public.my_vendor_id() or exists(select 1 from public.events e where e.id=event_id and e.organizer_id=public.my_organizer_id()));
create policy booth_history_read_parties on public.booth_bid_history for select to authenticated
 using (exists(select 1 from public.booth_bids b where b.id=bid_id));
revoke all on public.booth_bids, public.booth_bid_history from anon, authenticated;
grant select on public.booth_bids, public.booth_bid_history to authenticated;
grant all on public.booth_bids, public.booth_bid_history to service_role;
grant usage, select on sequence public.booth_bid_history_id_seq to service_role;

-- All writes use service-only, SECURITY INVOKER RPCs. The API supplies the
-- authenticated profile id; no browser-supplied identity or clock is trusted.
create function public.save_booth_config(p_event uuid,p_profile uuid,p_version integer,p_enabled boolean,p_map text,p_spaces jsonb,p_slots jsonb)
returns integer language plpgsql security invoker set search_path=public as $$
declare e public.events; s jsonb; new_version integer;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'not allowed'; end if;
 select * into e from public.events where id=p_event for update;
 if e.id is null or not exists(select 1 from public.organizers where id=e.organizer_id and profile_id=p_profile) then raise exception 'not allowed'; end if;
 if e.booth_config_version<>p_version then raise exception '設定が更新されています。再読み込みしてください。'; end if;
 if exists(select 1 from public.booth_bids where event_id=p_event) or exists(select 1 from public.applications where event_id=p_event) then raise exception '応募受付後は区画・募集条件を変更できません。'; end if;
 if not p_enabled then
  update public.events set booth_bidding_enabled=false,booth_config_version=booth_config_version+1 where id=p_event returning booth_config_version into new_version;
  return new_version;
 end if;
 if jsonb_typeof(p_spaces)<>'array' or jsonb_array_length(p_spaces)>100 or jsonb_typeof(p_slots)<>'array' or jsonb_array_length(p_slots)>100 then raise exception '区画の内容を確認してください。'; end if;
 if p_enabled then
   if e.application_deadline_at is null or e.application_deadline_at >= e.starts_at then raise exception '入札募集には開催開始前の応募締切が必要です。'; end if;
   if p_map is null or p_map not like p_event::text||'/booth-map-%' or not exists(select 1 from storage.objects where bucket_id='event-images' and name=p_map) then raise exception '区画図の画像添付が必要です。'; end if;
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
   if coalesce(btrim(s->>'label'),'')='' or length(s->>'label')>80 or not exists(select 1 from public.event_genre_slots where event_id=p_event and genre=s->>'genre') or (s->>'minimum_fee_yen')::numeric<>trunc((s->>'minimum_fee_yen')::numeric) or (s->>'minimum_fee_yen')::integer not between 1000 and 1000000 or (s->>'minimum_fee_yen')::integer % 1000<>0 or (s->>'map_x')::numeric not between 0 and 100 or (s->>'map_y')::numeric not between 0 and 100 or s->>'map_x' is null or s->>'map_y' is null or s->>'minimum_fee_yen' is null then raise exception '区画の番号・ジャンル・最低額・位置を確認してください。'; end if;
   if exists(select 1 from public.event_spaces where event_id=p_event and label=btrim(s->>'label')) then raise exception '区画番号が重複しています。'; end if;
   insert into public.event_spaces(event_id,label,genre,minimum_fee_yen,map_x,map_y) values(p_event,btrim(s->>'label'),s->>'genre',(s->>'minimum_fee_yen')::integer,(s->>'map_x')::numeric,(s->>'map_y')::numeric);
 end loop;
 if p_enabled and e.capacity is not null and (select coalesce(sum(capacity),0) from public.event_genre_slots where event_id=p_event)>e.capacity then raise exception 'ジャンル枠の合計はイベント全体の定員以下にしてください。'; end if;
 update public.events set booth_bidding_enabled=p_enabled,booth_map_path=p_map,booth_config_version=booth_config_version+1 where id=p_event returning booth_config_version into new_version;
 return new_version;
end $$;

create function public.submit_booth_bid(p_event uuid,p_profile uuid,p_amount integer,p_preferences uuid[],p_message text,p_version integer)
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
 if not exists(select 1 from public.event_genre_slots where event_id=p_event and genre=g and capacity>0) then raise exception 'このジャンルは募集していません。'; end if;
 if p_amount is null or p_amount not between 1000 and 1000000 or p_amount%1000<>0 or p_amount<old_bid.amount_yen then raise exception '提示額は1,000円単位で設定し、引き下げはできません。'; end if;
 if p_preferences is null or cardinality(p_preferences) not between 1 and 3 or cardinality(p_preferences)<>(select count(distinct x) from unnest(p_preferences) x) or exists(select 1 from unnest(p_preferences) x where not exists(select 1 from public.event_spaces s where s.id=x and s.event_id=p_event and s.genre=g and s.minimum_fee_yen<=p_amount and s.map_x is not null and s.map_y is not null)) then raise exception '希望区画のジャンル・最低額を確認してください。'; end if;
 if length(coalesce(p_message,''))>2000 then raise exception 'メッセージは2,000文字以内です。'; end if;
 if old_bid.id is null then
  insert into public.booth_bids(event_id,vendor_id,genre,amount_yen,preferences,message) values(p_event,v.id,g,p_amount,p_preferences,p_message) returning * into result;
 else
  update public.booth_bids set amount_yen=p_amount,amount_submitted_at=case when p_amount>old_bid.amount_yen then clock_timestamp() else old_bid.amount_submitted_at end,preferences=p_preferences,message=p_message,version=version+1 where id=old_bid.id returning * into result;
 end if;
 insert into public.booth_bid_history(bid_id,amount_yen,amount_submitted_at,preferences,version) values(result.id,result.amount_yen,result.amount_submitted_at,result.preferences,result.version);
 return result;
end $$;

create function public.finalize_booth_bids(p_event uuid,p_profile uuid,p_expected text)
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
 for b in select * from public.booth_bids where event_id=p_event order by genre,amount_yen desc,amount_submitted_at,id loop
  select capacity into cap from public.event_genre_slots where event_id=p_event and genre=b.genre;
  select count(*) into used from public.applications where event_id=p_event and vendor_genre_snapshot=b.genre and status in ('approved','paid');
  target:=null;
  if cap is not null and used<cap and (e.capacity is null or approved<e.capacity) then
   select s.* into target from unnest(b.preferences) with ordinality p(id,ord) join public.event_spaces s on s.id=p.id where s.event_id=p_event and s.genre=b.genre and s.minimum_fee_yen<=b.amount_yen and s.assigned_application_id is null order by p.ord limit 1;
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

-- Prevent alternate application routes and ordinary assignment controls from
-- bypassing the ranking. These guards never use editable user metadata.
create function public.guard_booth_application() returns trigger language plpgsql security definer set search_path=public as $$
declare enabled boolean;
begin
 if tg_op='UPDATE' and (new.id is distinct from old.id or new.event_id is distinct from old.event_id or new.vendor_id is distinct from old.vendor_id) then raise exception '応募者・イベントは変更できません。'; end if;
 select booth_bidding_enabled into enabled from public.events where id=new.event_id;
 if not enabled then return new; end if;
 if tg_op='INSERT' then
  if coalesce(auth.role(),'')<>'service_role' or new.booth_bid_id is null or not exists(select 1 from public.booth_bids b where b.id=new.booth_bid_id and b.event_id=new.event_id and b.vendor_id=new.vendor_id and b.amount_yen=new.booth_fee_yen_snapshot) then raise exception '区画応募画面から応募してください。'; end if;
 elsif new.status is distinct from old.status and new.status in ('approved','rejected') and coalesce(auth.role(),'')<>'service_role' then
  raise exception '入札募集は割当確定から承認してください。';
 elsif coalesce(auth.role(),'')<>'service_role' and (new.booth_bid_id is distinct from old.booth_bid_id or new.booth_fee_yen_snapshot is distinct from old.booth_fee_yen_snapshot or new.vendor_genre_snapshot is distinct from old.vendor_genre_snapshot) then
  raise exception '確定した入札条件は変更できません。';
 end if;
 return new;
end $$;
create trigger a_guard_booth_application before insert or update on public.applications for each row execute function public.guard_booth_application();

create function public.guard_booth_config() returns trigger language plpgsql security definer set search_path=public as $$
declare event_uuid uuid; e public.events; has_bids boolean;
begin
 event_uuid:=case when tg_table_name='events' then (case when tg_op='DELETE' then to_jsonb(old)->>'id' else to_jsonb(new)->>'id' end)::uuid else (case when tg_op='DELETE' then to_jsonb(old)->>'event_id' else to_jsonb(new)->>'event_id' end)::uuid end;
 select * into e from public.events where id=event_uuid for update;
 select exists(select 1 from public.booth_bids where event_id=event_uuid) into has_bids;
 if tg_table_name='events' then
  if tg_op='UPDATE' and has_bids and (new.booth_bidding_enabled is distinct from old.booth_bidding_enabled or new.booth_map_path is distinct from old.booth_map_path or new.application_deadline_at is distinct from old.application_deadline_at or new.capacity is distinct from old.capacity or new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at or new.status is distinct from old.status) then raise exception '応募受付後は募集条件を変更できません。'; end if;
  if tg_op='UPDATE' and new.booth_bidding_finalized_at is distinct from old.booth_bidding_finalized_at and coalesce(auth.role(),'')<>'service_role' then raise exception 'not allowed'; end if;
  if new.booth_bidding_enabled and new.status='published' then
   if new.capacity is not null and (select coalesce(sum(capacity),0) from public.event_genre_slots where event_id=new.id)>new.capacity then raise exception 'ジャンル枠の合計は全体定員以下にしてください。'; end if;
   if new.application_deadline_at is null or new.application_deadline_at>=new.starts_at or new.booth_map_path is null or not exists(select 1 from storage.objects where bucket_id='event-images' and name=new.booth_map_path) or not exists(select 1 from public.event_spaces where event_id=new.id) or exists(select 1 from public.event_spaces s where s.event_id=new.id and (s.map_x is null or s.map_y is null or s.minimum_fee_yen<1000 or s.genre is null or not exists(select 1 from public.event_genre_slots g where g.event_id=new.id and g.genre=s.genre))) then raise exception '区画図・締切・区画位置・最低額・ジャンル枠を設定してください。'; end if;
  end if;
 else
  if tg_op='UPDATE' and new.event_id is distinct from old.event_id then raise exception '区画・枠のイベントは変更できません。'; end if;
  if has_bids then
   if tg_op<>'UPDATE' then raise exception '応募受付後は募集条件を変更できません。'; end if;
   if tg_table_name='event_genre_slots' then
    if new.genre is distinct from old.genre or new.capacity is distinct from old.capacity then raise exception '応募受付後はジャンル枠を変更できません。'; end if;
   else
    if new.label is distinct from old.label or new.genre is distinct from old.genre or new.minimum_fee_yen is distinct from old.minimum_fee_yen or new.map_x is distinct from old.map_x or new.map_y is distinct from old.map_y then raise exception '応募受付後は区画条件を変更できません。'; end if;
    if new.assigned_application_id is distinct from old.assigned_application_id and coalesce(auth.role(),'')<>'service_role' then raise exception '入札募集の区画は割当確定で設定します。'; end if;
   end if;
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger guard_booth_event before insert or update on public.events for each row execute function public.guard_booth_config();
create trigger guard_booth_spaces before insert or update or delete on public.event_spaces for each row execute function public.guard_booth_config();
create trigger guard_booth_slots before insert or update or delete on public.event_genre_slots for each row execute function public.guard_booth_config();
revoke all on function public.save_booth_config(uuid,uuid,integer,boolean,text,jsonb,jsonb), public.submit_booth_bid(uuid,uuid,integer,uuid[],text,integer), public.finalize_booth_bids(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.save_booth_config(uuid,uuid,integer,boolean,text,jsonb,jsonb), public.submit_booth_bid(uuid,uuid,integer,uuid[],text,integer), public.finalize_booth_bids(uuid,uuid,text) to service_role;
revoke all on function public.guard_booth_application(),public.guard_booth_config() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.enforce_application_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ev record;
  v_genre text;
  approved_now int;
  genre_cap int;
  genre_approved int;
begin
  if tg_op = 'INSERT' then
    select status, ends_at, application_deadline_at into ev
      from events where id = new.event_id;
    if ev.status is distinct from 'published' then
      raise exception 'event is not open for applications';
    end if;
    if ev.ends_at < now() then
      raise exception 'event has ended';
    end if;
    if new.booth_bid_id is null and ev.application_deadline_at is not null and ev.application_deadline_at < now() then
      raise exception 'application deadline has passed';
    end if;

    -- 応募者ジャンルをスナップショット
    if new.booth_bid_id is not null then
      select genre into v_genre from booth_bids where id = new.booth_bid_id;
    else
      select genre into v_genre from vendors where id = new.vendor_id;
    end if;
    new.vendor_genre_snapshot := v_genre;

    -- ジャンル枠が定義されていて、承認済みが上限に達していれば新規応募を締切
    select capacity into genre_cap from event_genre_slots
      where event_id = new.event_id and genre = v_genre;
    if genre_cap is not null then
      select count(*) into genre_approved from applications
        where event_id = new.event_id
          and vendor_genre_snapshot = v_genre
          and status in ('approved','paid');
      if genre_approved >= genre_cap then
        raise exception 'genre slot for % is full', v_genre;
      end if;
    end if;

    new.status := 'pending';
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  if old.status = 'pending' and new.status in ('approved','rejected','cancelled') then
    if new.status = 'approved' then
      perform 1 from events where id = new.event_id for update;
      -- 全体定員
      select count(*) into approved_now from applications
        where event_id = new.event_id and status in ('approved','paid') and id <> new.id;
      if (select capacity from events where id = new.event_id) is not null
         and approved_now >= (select capacity from events where id = new.event_id) then
        raise exception 'event capacity reached';
      end if;
      -- ジャンル枠上限(承認段階でも二重チェック)
      select capacity into genre_cap from event_genre_slots
        where event_id = new.event_id and genre = new.vendor_genre_snapshot;
      if genre_cap is not null then
        select count(*) into genre_approved from applications
          where event_id = new.event_id
            and vendor_genre_snapshot = new.vendor_genre_snapshot
            and status in ('approved','paid') and id <> new.id;
        if genre_approved >= genre_cap then
          raise exception 'genre slot for % is full', new.vendor_genre_snapshot;
        end if;
      end if;
      new.approved_at := now();
    elsif new.status = 'rejected' then
      new.rejected_at := now();
    end if;
  elsif old.status = 'approved' and new.status in ('paid','cancelled') then
    if new.status = 'paid' then
      if coalesce(auth.role(),'') <> 'service_role' and current_user not in ('postgres','service_role') then
        raise exception 'paid status can only be set by server (webhook)';
      end if;
      new.paid_at := now();
    end if;
  else
    raise exception 'illegal status transition: % -> %', old.status, new.status;
  end if;
  return new;
end $function$

;

create index booth_bid_history_bid_id on public.booth_bid_history(bid_id);
