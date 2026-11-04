-- Public homepage content is separate from the owner's unpublished draft.
create table if not exists public.site_editors (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.site_drafts (
  page text primary key check (page = 'home'),
  content jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.site_published (
  page text primary key check (page = 'home'),
  content jsonb not null,
  published_at timestamptz not null default now()
);
alter table public.site_editors enable row level security;
alter table public.site_drafts enable row level security;
alter table public.site_published enable row level security;
revoke all on public.site_editors, public.site_drafts, public.site_published from anon, authenticated;
grant select on public.site_editors to authenticated;
grant select, insert, update on public.site_drafts to authenticated;
grant select on public.site_published to anon;
grant select, insert, update on public.site_published to authenticated;
create policy "Editors can read their grant" on public.site_editors for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Editors can read drafts" on public.site_drafts for select to authenticated
  using (exists (select 1 from public.site_editors where user_id = (select auth.uid())));
create policy "Editors can insert drafts" on public.site_drafts for insert to authenticated
  with check (exists (select 1 from public.site_editors where user_id = (select auth.uid())));
create policy "Editors can update drafts" on public.site_drafts for update to authenticated
  using (exists (select 1 from public.site_editors where user_id = (select auth.uid())))
  with check (exists (select 1 from public.site_editors where user_id = (select auth.uid())));
create policy "Everyone can read published homepage" on public.site_published for select to anon, authenticated using (true);
create policy "Editors can insert published homepage" on public.site_published for insert to authenticated
  with check (exists (select 1 from public.site_editors where user_id = (select auth.uid())));
create policy "Editors can update published homepage" on public.site_published for update to authenticated
  using (exists (select 1 from public.site_editors where user_id = (select auth.uid())))
  with check (exists (select 1 from public.site_editors where user_id = (select auth.uid())));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
