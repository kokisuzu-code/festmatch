-- A Spot contract is a one-time purchase for one draft event. It never creates
-- a Stripe subscription and only entitles that specific event to be published
-- for up to three months after payment.
create table public.organizer_spot_contracts (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  event_id uuid not null unique references public.events(id) on delete cascade,
  amount_yen integer not null default 250000 check (amount_yen = 250000),
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'refunded')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  access_ends_at timestamp with time zone not null,
  activated_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index organizer_spot_contracts_event_entitlement_idx
  on public.organizer_spot_contracts (event_id, status, access_ends_at);

create trigger trg_organizer_spot_contracts_updated
  before update on public.organizer_spot_contracts
  for each row execute function public.set_updated_at();

alter table public.organizer_spot_contracts enable row level security;

create policy organizer_spot_contracts_select_own
  on public.organizer_spot_contracts
  for select to authenticated
  using (organizer_id = public.my_organizer_id());

-- Publishing is enforced at the database boundary. An active annual
-- subscription grants account-wide access; an active Spot contract grants
-- access only to its linked event until the three-month use window ends.
drop policy if exists events_insert_own on public.events;
create policy events_insert_own on public.events
  as permissive for insert to authenticated
  with check (
    organizer_id = public.my_organizer_id()
    and (
      status <> 'published'
      or exists (
        select 1
        from public.organizers organizer
        where organizer.id = events.organizer_id
          and organizer.profile_id = (select auth.uid())
          and organizer.billing_status = 'active'
          and organizer.billing_plan = 'annual'
      )
      or exists (
        select 1
        from public.organizer_spot_contracts spot
        where spot.organizer_id = events.organizer_id
          and spot.event_id = events.id
          and spot.status = 'active'
          and spot.access_ends_at > now()
      )
    )
  );

drop policy if exists events_update_own on public.events;
create policy events_update_own on public.events
  as permissive for update to authenticated
  using (organizer_id = public.my_organizer_id())
  with check (
    organizer_id = public.my_organizer_id()
    and (
      status <> 'published'
      or exists (
        select 1
        from public.organizers organizer
        where organizer.id = events.organizer_id
          and organizer.profile_id = (select auth.uid())
          and organizer.billing_status = 'active'
          and organizer.billing_plan = 'annual'
      )
      or exists (
        select 1
        from public.organizer_spot_contracts spot
        where spot.organizer_id = events.organizer_id
          and spot.event_id = events.id
          and spot.status = 'active'
          and spot.access_ends_at > now()
      )
    )
  );
