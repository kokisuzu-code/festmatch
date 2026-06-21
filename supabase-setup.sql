-- ============================================================
-- FestMatch Supabase セットアップSQL
-- SQL Editorで上から順に1ブロックずつ実行してください
-- ============================================================


-- ============================================================
-- 2-1. enum型の定義
-- ============================================================

create type user_role as enum ('organizer', 'kitchen_car_owner');

create type subscription_plan as enum ('free', 'starter', 'standard', 'pro');

create type event_status as enum ('draft', 'published', 'closed', 'cancelled');

create type application_status as enum (
  'pending',
  'approved',
  'declined',
  'cancelled',
  'waitlist'
);

create type weather_type as enum ('sunny', 'cloudy', 'rainy');

create type subscription_status as enum ('active', 'cancelled', 'past_due');


-- ============================================================
-- 2-2. profiles テーブル
-- ============================================================

create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  role               user_role not null,
  name               text not null,
  email              text not null,
  avatar_url         text,
  plan               subscription_plan not null default 'free',
  stripe_customer_id text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: 自分のみ参照"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: 自分のみ更新"
  on profiles for update
  using (auth.uid() = id);


-- ============================================================
-- 2-3. kitchen_cars テーブル
-- ============================================================

create table kitchen_cars (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references profiles(id) on delete cascade,
  name         text not null,
  genre        text[] not null default '{}',
  car_length_m numeric(4,1),
  needs_power  boolean not null default false,
  license_url  text,
  verified     boolean not null default false,
  photo_urls   text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table kitchen_cars enable row level security;

create policy "kitchen_cars: オーナーのみ操作"
  on kitchen_cars for all
  using (owner_id = auth.uid());

create policy "kitchen_cars: 認証済みユーザーは参照可"
  on kitchen_cars for select
  using (auth.role() = 'authenticated' and verified = true);


-- ============================================================
-- 2-4. events テーブル
-- ============================================================

create table events (
  id                uuid primary key default gen_random_uuid(),
  organizer_id      uuid not null references profiles(id) on delete cascade,
  title             text not null,
  date              date not null,
  start_time        time,
  end_time          time,
  location          text not null,
  prefecture        text not null,
  expected_visitors int,
  total_slots       int not null default 10,
  fee               int not null default 0,
  has_power         boolean not null default false,
  has_water         boolean not null default false,
  has_parking       boolean not null default false,
  cancel_policy     jsonb not null default '{
    "day_before_rate": 50,
    "same_day_rate": 100
  }',
  apply_deadline    date,
  status            event_status not null default 'draft',
  description       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table events enable row level security;

create policy "events: 公開済みは全員参照可"
  on events for select
  using (status = 'published');

create policy "events: 主催者は全操作可"
  on events for all
  using (organizer_id = auth.uid());


-- ============================================================
-- 2-5. event_genre_slots テーブル
-- ============================================================

create table event_genre_slots (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  genre          text not null,
  max_count      int not null default 2,
  approved_count int not null default 0,
  created_at     timestamptz not null default now()
);

alter table event_genre_slots enable row level security;

create policy "genre_slots: 公開イベントは全員参照可"
  on event_genre_slots for select
  using (
    exists (
      select 1 from events
      where events.id = event_genre_slots.event_id
        and events.status = 'published'
    )
  );

create policy "genre_slots: 主催者は全操作可"
  on event_genre_slots for all
  using (
    exists (
      select 1 from events
      where events.id = event_genre_slots.event_id
        and events.organizer_id = auth.uid()
    )
  );


-- ============================================================
-- 2-6. applications テーブル
-- ============================================================

create table applications (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  kitchen_car_id uuid not null references kitchen_cars(id) on delete cascade,
  genre          text not null,
  status         application_status not null default 'pending',
  space_no       text,
  is_waitlist    boolean not null default false,
  decline_reason text,
  applied_at     timestamptz not null default now(),
  decided_at     timestamptz,
  unique(event_id, kitchen_car_id)
);

alter table applications enable row level security;

create policy "applications: キッチンカーオーナーは自分の応募参照可"
  on applications for select
  using (
    exists (
      select 1 from kitchen_cars
      where kitchen_cars.id = applications.kitchen_car_id
        and kitchen_cars.owner_id = auth.uid()
    )
  );

create policy "applications: 主催者は自イベントの応募参照可"
  on applications for select
  using (
    exists (
      select 1 from events
      where events.id = applications.event_id
        and events.organizer_id = auth.uid()
    )
  );

create policy "applications: キッチンカーオーナーは応募作成可"
  on applications for insert
  with check (
    exists (
      select 1 from kitchen_cars
      where kitchen_cars.id = applications.kitchen_car_id
        and kitchen_cars.owner_id = auth.uid()
    )
  );

create policy "applications: 主催者はstatus更新可"
  on applications for update
  using (
    exists (
      select 1 from events
      where events.id = applications.event_id
        and events.organizer_id = auth.uid()
    )
  );


-- ============================================================
-- 2-7. messages テーブル
-- ============================================================

create table messages (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  sender_id      uuid not null references profiles(id),
  body           text not null,
  is_template    boolean not null default false,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

alter table messages enable row level security;

create policy "messages: 当事者のみ操作可"
  on messages for all
  using (
    exists (
      select 1 from applications a
      join events e on e.id = a.event_id
      join kitchen_cars kc on kc.id = a.kitchen_car_id
      where a.id = messages.application_id
        and (e.organizer_id = auth.uid() or kc.owner_id = auth.uid())
    )
  );


-- ============================================================
-- 2-8. sales_records テーブル
-- ============================================================

create table sales_records (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  kitchen_car_id uuid not null references kitchen_cars(id),
  amount         int not null,
  units_sold     int,
  weather        weather_type,
  memo           text,
  recorded_at    timestamptz not null default now()
);

alter table sales_records enable row level security;

create policy "sales_records: オーナーのみ操作可"
  on sales_records for all
  using (
    exists (
      select 1 from kitchen_cars
      where kitchen_cars.id = sales_records.kitchen_car_id
        and kitchen_cars.owner_id = auth.uid()
    )
  );


-- ============================================================
-- 2-9. subscriptions テーブル
-- ============================================================

create table subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  plan          subscription_plan not null,
  stripe_sub_id text unique,
  slot_limit    int not null default 2,
  slots_used    int not null default 0,
  period_start  date not null,
  period_end    date not null,
  status        subscription_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "subscriptions: 自分のみ参照"
  on subscriptions for select
  using (user_id = auth.uid());


-- ============================================================
-- 2-10. reviews テーブル
-- ============================================================

create table reviews (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  reviewer_id    uuid not null references profiles(id),
  target_id      uuid not null references profiles(id),
  score          int not null check (score between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now(),
  unique(application_id, reviewer_id)
);

alter table reviews enable row level security;

create policy "reviews: 全員参照可"
  on reviews for select
  using (auth.role() = 'authenticated');

create policy "reviews: 当事者のみ作成可"
  on reviews for insert
  with check (reviewer_id = auth.uid());


-- ============================================================
-- Step 3. View の作成
-- ============================================================

create view events_with_slots as
select
  e.*,
  json_agg(
    json_build_object(
      'genre', gs.genre,
      'max_count', gs.max_count,
      'approved_count', gs.approved_count,
      'remaining', gs.max_count - gs.approved_count
    )
  ) as genre_slots
from events e
left join event_genre_slots gs on gs.event_id = e.id
group by e.id;
