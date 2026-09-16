-- FestMatch remote baseline generated from jktjmdnfmxfradmzzqzy.

-- Source: current remote schema, RLS policies, public views, functions, triggers, and FestMatch storage.

create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
id uuid not null,
role text not null,
display_name text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
constraint profiles_pkey PRIMARY KEY (id),
constraint profiles_role_check CHECK (role = ANY (ARRAY['organizer'::text, 'vendor'::text, 'admin'::text]))
);

create table public.organizers (
id uuid default gen_random_uuid() not null,
profile_id uuid not null,
organization_name text not null,
contact_name text,
contact_email text,
contact_phone text,
billing_plan text,
billing_status text default 'draft'::text not null,
stripe_customer_id text,
stripe_subscription_id text,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
constraint organizers_billing_plan_check CHECK (billing_plan = ANY (ARRAY['annual'::text, 'spot'::text])),
constraint organizers_billing_status_check CHECK (billing_status = ANY (ARRAY['draft'::text, 'active'::text, 'past_due'::text, 'canceled'::text])),
constraint organizers_pkey PRIMARY KEY (id),
constraint organizers_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
constraint organizers_profile_id_key UNIQUE (profile_id)
);

create table public.vendors (
id uuid default gen_random_uuid() not null,
profile_id uuid not null,
name text not null,
slug text not null,
genre text not null,
description text,
prefecture text,
website_url text,
instagram_url text,
photo_paths text[] default '{}'::text[] not null,
subscription_tier text default 'free'::text not null,
is_public boolean default false not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
constraint vendors_instagram_url_check CHECK (instagram_url IS NULL OR instagram_url ~ '^https?://'::text),
constraint vendors_pkey PRIMARY KEY (id),
constraint vendors_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
constraint vendors_profile_id_key UNIQUE (profile_id),
constraint vendors_slug_check CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'::text),
constraint vendors_slug_key UNIQUE (slug),
constraint vendors_subscription_tier_check CHECK (subscription_tier = ANY (ARRAY['free'::text, 'light'::text, 'standard'::text, 'pro'::text])),
constraint vendors_website_url_check CHECK (website_url IS NULL OR website_url ~ '^https?://'::text)
);

create table public.events (
id uuid default gen_random_uuid() not null,
organizer_id uuid not null,
title text not null,
slug text not null,
description text,
prefecture text not null,
address text,
latitude double precision,
longitude double precision,
starts_at timestamp with time zone not null,
ends_at timestamp with time zone not null,
application_deadline_at timestamp with time zone,
booth_fee_yen integer default 0 not null,
capacity integer,
status text default 'draft'::text not null,
cover_photo_path text,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
constraint events_booth_fee_yen_check CHECK (booth_fee_yen >= 0),
constraint events_capacity_check CHECK (capacity > 0),
constraint events_check CHECK (ends_at > starts_at),
constraint events_latitude_check CHECK (latitude >= '-90'::integer::double precision AND latitude <= 90::double precision),
constraint events_longitude_check CHECK (longitude >= '-180'::integer::double precision AND longitude <= 180::double precision),
constraint events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE,
constraint events_pkey PRIMARY KEY (id),
constraint events_slug_check CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'::text),
constraint events_slug_key UNIQUE (slug),
constraint events_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'canceled'::text]))
);

create table public.applications (
id uuid default gen_random_uuid() not null,
event_id uuid not null,
vendor_id uuid not null,
status text default 'pending'::text not null,
message text,
approved_at timestamp with time zone,
rejected_at timestamp with time zone,
paid_at timestamp with time zone,
stripe_checkout_session_id text,
stripe_payment_intent_id text,
platform_fee_yen integer,
booth_fee_yen_snapshot integer,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
constraint applications_booth_fee_yen_snapshot_check CHECK (booth_fee_yen_snapshot >= 0),
constraint applications_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
constraint applications_event_id_vendor_id_key UNIQUE (event_id, vendor_id),
constraint applications_pkey PRIMARY KEY (id),
constraint applications_platform_fee_yen_check CHECK (platform_fee_yen >= 0),
constraint applications_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text, 'paid'::text])),
constraint applications_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

create table public.pending_applications (
id uuid default gen_random_uuid() not null,
event_id uuid not null,
email text not null,
vendor_name text not null,
genre text,
message text,
claim_token_hash text not null,
expires_at timestamp with time zone not null,
claimed_at timestamp with time zone,
created_at timestamp with time zone default now() not null,
constraint pending_applications_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
constraint pending_applications_pkey PRIMARY KEY (id)
);

create table public.sales_records (
id uuid default gen_random_uuid() not null,
vendor_id uuid not null,
event_id uuid not null,
sales_date date not null,
gross_sales_yen integer not null,
source text default 'manual'::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
constraint sales_records_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
constraint sales_records_gross_sales_yen_check CHECK (gross_sales_yen >= 0),
constraint sales_records_pkey PRIMARY KEY (id),
constraint sales_records_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

create table public.vendor_billing (
vendor_id uuid not null,
stripe_customer_id text,
stripe_subscription_id text,
subscription_status text,
stripe_connect_account_id text,
connect_onboarding_complete boolean default false not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
constraint vendor_billing_pkey PRIMARY KEY (vendor_id),
constraint vendor_billing_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

create table public.external_events (
id uuid default gen_random_uuid() not null,
slug text not null,
title text not null,
description text,
prefecture text not null,
address text,
latitude double precision,
longitude double precision,
starts_at timestamp with time zone not null,
ends_at timestamp with time zone not null,
official_url text,
source_url text,
verified_at timestamp with time zone,
verified_by uuid,
status text default 'draft'::text not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
constraint external_events_check CHECK (ends_at > starts_at),
constraint external_events_latitude_check CHECK (latitude >= '-90'::integer::double precision AND latitude <= 90::double precision),
constraint external_events_longitude_check CHECK (longitude >= '-180'::integer::double precision AND longitude <= 180::double precision),
constraint external_events_official_url_check CHECK (official_url IS NULL OR official_url ~ '^https?://'::text),
constraint external_events_pkey PRIMARY KEY (id),
constraint external_events_slug_check CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'::text),
constraint external_events_slug_key UNIQUE (slug),
constraint external_events_source_url_check CHECK (source_url IS NULL OR source_url ~ '^https?://'::text),
constraint external_events_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])),
constraint external_events_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES profiles(id)
);

CREATE INDEX idx_events_organizer ON public.events USING btree (organizer_id);
CREATE INDEX idx_events_pref_status ON public.events USING btree (prefecture, status);
CREATE INDEX idx_applications_event ON public.applications USING btree (event_id);
CREATE INDEX idx_applications_vendor ON public.applications USING btree (vendor_id);
CREATE INDEX idx_pending_event ON public.pending_applications USING btree (event_id);
CREATE INDEX idx_pending_token ON public.pending_applications USING btree (claim_token_hash);
CREATE INDEX idx_sales_event ON public.sales_records USING btree (event_id);
CREATE INDEX idx_sales_vendor ON public.sales_records USING btree (vendor_id);
CREATE INDEX idx_external_pref_status ON public.external_events USING btree (prefecture, status);

CREATE OR REPLACE FUNCTION public.enforce_application_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ev record;
  approved_now int;
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
    if ev.application_deadline_at is not null and ev.application_deadline_at < now() then
      raise exception 'application deadline has passed';
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
      select count(*) into approved_now from applications
        where event_id = new.event_id and status in ('approved','paid') and id <> new.id;
      if (select capacity from events where id = new.event_id) is not null
         and approved_now >= (select capacity from events where id = new.event_id) then
        raise exception 'event capacity reached';
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

CREATE OR REPLACE FUNCTION public.my_organizer_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id from organizers where profile_id = auth.uid()
$function$

CREATE OR REPLACE FUNCTION public.my_vendor_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id from vendors where profile_id = auth.uid()
$function$

CREATE OR REPLACE FUNCTION public.organizer_event_genre_stats(p_event_id uuid)
 RETURNS TABLE(genre text, vendor_count bigint, total_sales_yen bigint, average_sales_yen bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select v.genre,
         count(distinct s.vendor_id) as vendor_count,
         sum(s.gross_sales_yen)::bigint as total_sales_yen,
         avg(s.gross_sales_yen)::bigint as average_sales_yen
  from sales_records s
  join vendors v on v.id = s.vendor_id
  where s.event_id = p_event_id
    and exists (select 1 from events e
                where e.id = p_event_id
                  and e.organizer_id = public.my_organizer_id())
  group by v.genre
  having count(distinct s.vendor_id) >= 3
$function$

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$

CREATE OR REPLACE FUNCTION public.user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from profiles where id = auth.uid()
$function$


create or replace view public.organizers_public as
 SELECT id,
    organization_name
   FROM organizers;

create or replace view public.vendors_public with (security_invoker = true) as
 SELECT id,
    name,
    slug,
    genre,
    description,
    prefecture,
    website_url,
    instagram_url,
    photo_paths,
    subscription_tier,
    created_at
   FROM vendors
  WHERE is_public = true;

alter table public.profiles enable row level security;
alter table public.organizers enable row level security;
alter table public.vendors enable row level security;
alter table public.events enable row level security;
alter table public.applications enable row level security;
alter table public.pending_applications enable row level security;
alter table public.sales_records enable row level security;
alter table public.vendor_billing enable row level security;
alter table public.external_events enable row level security;

create policy applications_insert_vendor on public.applications as PERMISSIVE for INSERT to public
  with check ((vendor_id = my_vendor_id()));

create policy applications_select_parties on public.applications as PERMISSIVE for SELECT to public
  using (((vendor_id = my_vendor_id()) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = applications.event_id) AND (e.organizer_id = my_organizer_id()))))));

create policy applications_update_organizer_decide on public.applications as PERMISSIVE for UPDATE to public
  using ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = applications.event_id) AND (e.organizer_id = my_organizer_id())))))
  with check (((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = applications.event_id) AND (e.organizer_id = my_organizer_id())))) AND (status = ANY (ARRAY['approved'::text, 'rejected'::text]))));

create policy applications_update_vendor_cancel on public.applications as PERMISSIVE for UPDATE to public
  using ((vendor_id = my_vendor_id()))
  with check (((vendor_id = my_vendor_id()) AND (status = 'cancelled'::text)));

create policy events_delete_own on public.events as PERMISSIVE for DELETE to public
  using (((organizer_id = my_organizer_id()) AND (status = 'draft'::text)));

create policy events_insert_own on public.events as PERMISSIVE for INSERT to public
  with check ((organizer_id = my_organizer_id()));

create policy events_select_published on public.events as PERMISSIVE for SELECT to public
  using (((status = 'published'::text) OR (organizer_id = my_organizer_id()) OR (user_role() = 'admin'::text)));

create policy events_update_own on public.events as PERMISSIVE for UPDATE to public
  using ((organizer_id = my_organizer_id()))
  with check ((organizer_id = my_organizer_id()));

create policy external_admin_delete on public.external_events as PERMISSIVE for DELETE to public
  using ((user_role() = 'admin'::text));

create policy external_admin_insert on public.external_events as PERMISSIVE for INSERT to public
  with check ((user_role() = 'admin'::text));

create policy external_admin_update on public.external_events as PERMISSIVE for UPDATE to public
  using ((user_role() = 'admin'::text))
  with check ((user_role() = 'admin'::text));

create policy external_select_published on public.external_events as PERMISSIVE for SELECT to public
  using (((status = 'published'::text) OR (user_role() = 'admin'::text)));

create policy organizers_select_own on public.organizers as PERMISSIVE for SELECT to public
  using (((profile_id = auth.uid()) OR (user_role() = 'admin'::text)));

create policy organizers_update_own on public.organizers as PERMISSIVE for UPDATE to public
  using ((profile_id = auth.uid()))
  with check ((profile_id = auth.uid()));

create policy profiles_select_own on public.profiles as PERMISSIVE for SELECT to public
  using (((id = auth.uid()) OR (user_role() = 'admin'::text)));

create policy profiles_update_own on public.profiles as PERMISSIVE for UPDATE to public
  using ((id = auth.uid()))
  with check ((id = auth.uid()));

create policy sales_delete_own on public.sales_records as PERMISSIVE for DELETE to public
  using ((vendor_id = my_vendor_id()));

create policy sales_insert_own on public.sales_records as PERMISSIVE for INSERT to public
  with check ((vendor_id = my_vendor_id()));

create policy sales_select_own on public.sales_records as PERMISSIVE for SELECT to public
  using ((vendor_id = my_vendor_id()));

create policy sales_update_own on public.sales_records as PERMISSIVE for UPDATE to public
  using ((vendor_id = my_vendor_id()))
  with check ((vendor_id = my_vendor_id()));

create policy vendor_billing_select_own on public.vendor_billing as PERMISSIVE for SELECT to public
  using ((vendor_id = my_vendor_id()));

create policy vendors_select_public on public.vendors as PERMISSIVE for SELECT to public
  using (((is_public = true) OR (profile_id = auth.uid()) OR (user_role() = 'admin'::text)));

create policy vendors_update_own on public.vendors as PERMISSIVE for UPDATE to public
  using ((profile_id = auth.uid()))
  with check ((profile_id = auth.uid()));

create policy event_images_delete_own on storage.objects as PERMISSIVE for DELETE to authenticated
  using (((bucket_id = 'event-images'::text) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE (((e.id)::text = (storage.foldername(objects.name))[1]) AND (e.organizer_id = my_organizer_id()))))));

create policy event_images_insert_own on storage.objects as PERMISSIVE for INSERT to authenticated
  with check (((bucket_id = 'event-images'::text) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE (((e.id)::text = (storage.foldername(objects.name))[1]) AND (e.organizer_id = my_organizer_id()))))));

create policy event_images_update_own on storage.objects as PERMISSIVE for UPDATE to authenticated
  using (((bucket_id = 'event-images'::text) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE (((e.id)::text = (storage.foldername(objects.name))[1]) AND (e.organizer_id = my_organizer_id()))))));

create policy festmatch_public_read on storage.objects as PERMISSIVE for SELECT to public
  using ((bucket_id = ANY (ARRAY['vendor-photos'::text, 'event-images'::text])));

create policy vendor_photos_delete_own on storage.objects as PERMISSIVE for DELETE to authenticated
  using (((bucket_id = 'vendor-photos'::text) AND ((storage.foldername(name))[1] = (my_vendor_id())::text)));

create policy vendor_photos_insert_own on storage.objects as PERMISSIVE for INSERT to authenticated
  with check (((bucket_id = 'vendor-photos'::text) AND ((storage.foldername(name))[1] = (my_vendor_id())::text)));

create policy vendor_photos_update_own on storage.objects as PERMISSIVE for UPDATE to authenticated
  using (((bucket_id = 'vendor-photos'::text) AND ((storage.foldername(name))[1] = (my_vendor_id())::text)));

CREATE TRIGGER trg_application_rules BEFORE INSERT OR UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION enforce_application_rules();
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_external_updated BEFORE UPDATE ON external_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_organizers_updated BEFORE UPDATE ON organizers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON sales_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vendor_billing_updated BEFORE UPDATE ON vendor_billing FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION set_updated_at();

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.applications to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.applications to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.applications to service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.events to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.events to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.events to service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.external_events to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.external_events to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.external_events to service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.organizers to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.organizers to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.organizers to service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.pending_applications to service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.profiles to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.profiles to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.profiles to service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sales_records to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sales_records to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.sales_records to service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.vendor_billing to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.vendor_billing to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.vendor_billing to service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.vendors to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.vendors to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.vendors to service_role;

insert into storage.buckets (id, name, public)
values
  ('event-images', 'event-images', true),
  ('vendor-photos', 'vendor-photos', true)
on conflict (id) do update set public = excluded.public;
