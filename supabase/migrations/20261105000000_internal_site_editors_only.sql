-- A site_editor grant is only effective for a FestMatch platform owner or staff member.
drop policy if exists "Editors can read their grant" on public.site_editors;
create policy "Internal editors can read their grant" on public.site_editors for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_platform_admin()));

drop policy if exists "Editors can read drafts" on public.site_drafts;
create policy "Internal editors can read drafts" on public.site_drafts for select to authenticated
  using ((select public.is_platform_admin()) and exists (select 1 from public.site_editors where user_id = (select auth.uid())));
drop policy if exists "Editors can insert drafts" on public.site_drafts;
create policy "Internal editors can insert drafts" on public.site_drafts for insert to authenticated
  with check ((select public.is_platform_admin()) and exists (select 1 from public.site_editors where user_id = (select auth.uid())));
drop policy if exists "Editors can update drafts" on public.site_drafts;
create policy "Internal editors can update drafts" on public.site_drafts for update to authenticated
  using ((select public.is_platform_admin()) and exists (select 1 from public.site_editors where user_id = (select auth.uid())))
  with check ((select public.is_platform_admin()) and exists (select 1 from public.site_editors where user_id = (select auth.uid())));

drop policy if exists "Editors can insert published homepage" on public.site_published;
create policy "Internal editors can insert published homepage" on public.site_published for insert to authenticated
  with check ((select public.is_platform_admin()) and exists (select 1 from public.site_editors where user_id = (select auth.uid())));
drop policy if exists "Editors can update published homepage" on public.site_published;
create policy "Internal editors can update published homepage" on public.site_published for update to authenticated
  using ((select public.is_platform_admin()) and exists (select 1 from public.site_editors where user_id = (select auth.uid())))
  with check ((select public.is_platform_admin()) and exists (select 1 from public.site_editors where user_id = (select auth.uid())));
