-- Organizer Spot is a monthly subscription with a three-month minimum term.
-- The application writes this timestamp only from verified Stripe webhooks.
alter table public.organizers
  add column if not exists minimum_contract_ends_at timestamp with time zone;

-- Publishing is an entitlement, not merely a UI action. Enforce it at the
-- database boundary so direct REST calls cannot publish without billing.
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
          and organizer.billing_plan in ('annual', 'spot')
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
          and organizer.billing_plan in ('annual', 'spot')
      )
    )
  );
