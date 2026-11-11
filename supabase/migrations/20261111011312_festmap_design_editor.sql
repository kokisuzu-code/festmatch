-- Each page keeps its own draft and published document under the existing editor policies.
alter table public.site_drafts drop constraint site_drafts_page_check,
  add constraint site_drafts_page_check check (page in ('home', 'festmap'));
alter table public.site_published drop constraint site_published_page_check,
  add constraint site_published_page_check check (page in ('home', 'festmap'));

create function public.save_festmap_design(
  design jsonb, previous_save timestamptz, publish boolean
) returns timestamptz
language plpgsql security invoker set search_path = ''
as $$
declare
  saved_at timestamptz := clock_timestamp();
begin
  if previous_save is null then
    insert into public.site_drafts(page, content, updated_at)
      values ('festmap', design, saved_at) on conflict (page) do nothing;
  else
    update public.site_drafts set content = design, updated_at = saved_at
      where page = 'festmap' and updated_at = previous_save;
  end if;
  if not found then
    raise exception 'Draft has changed' using errcode = '40001';
  end if;
  if publish then
    insert into public.site_published(page, content, published_at)
      values ('festmap', design, saved_at)
      on conflict (page) do update set content = excluded.content, published_at = excluded.published_at;
  end if;
  return saved_at;
end;
$$;
revoke all on function public.save_festmap_design(jsonb, timestamptz, boolean) from public, anon;
grant execute on function public.save_festmap_design(jsonb, timestamptz, boolean) to authenticated;
