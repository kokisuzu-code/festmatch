-- 売上記録テーブル
create table if not exists sales_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kitchen_car_id uuid references kitchen_cars(id) on delete set null,
  application_id uuid references applications(id) on delete set null,
  event_name text not null,
  event_date date not null,
  sales_amount integer not null default 0,  -- 円
  customer_count integer,
  weather text check (weather in ('sunny', 'cloudy', 'rainy')),
  notes text,
  created_at timestamptz not null default now()
);

-- RLS
alter table sales_records enable row level security;

create policy "自分の売上のみ参照"
  on sales_records for select
  using (auth.uid() = owner_id);

create policy "自分の売上のみ作成"
  on sales_records for insert
  with check (auth.uid() = owner_id);

create policy "自分の売上のみ更新"
  on sales_records for update
  using (auth.uid() = owner_id);

create policy "自分の売上のみ削除"
  on sales_records for delete
  using (auth.uid() = owner_id);
