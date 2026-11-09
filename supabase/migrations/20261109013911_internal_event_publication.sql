-- Only the owner may publish. The entitlement is issued by Auth administrators.
-- The application always creates drafts and publishes through an update.
create policy events_update_internal_own on public.events
  for update to authenticated
  using (
    organizer_id = (select public.my_organizer_id())
    and (select auth.jwt() -> 'app_metadata' -> 'festmatch_internal_access') = 'true'::jsonb
  )
  with check (
    organizer_id = (select public.my_organizer_id())
    and (select auth.jwt() -> 'app_metadata' -> 'festmatch_internal_access') = 'true'::jsonb
  );
