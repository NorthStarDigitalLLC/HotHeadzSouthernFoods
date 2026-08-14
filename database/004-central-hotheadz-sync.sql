-- ============================================================================
-- Hot Headz Southern Foods -> central NorthStar/BHI Supabase sync
--
-- Run this in the SAME central Supabase project used by NorthStar and BHI:
--   Dashboard project ref: fkisefambrcyxjrwrplb
--   https://fkisefambrcyxjrwrplb.supabase.co
--
-- Safe to re-run. This migration:
--   1. Creates three clearly labelled Hotheadz_* tables.
--   2. Copies existing Hotheadz rows from older site_* tables when present.
--   3. Seeds only missing menu defaults, including Same Daily.
--   4. Allows public menu reads while keeping all browser writes blocked.
--
-- It does NOT delete or rename any existing table or row.
-- ============================================================================

begin;

-- Fail loudly if this was pasted into the old Hotheadz project. The live BHI
-- project has this table; the retired and mistaken projects do not.
do $$
begin
  if to_regclass('public.bhi_site_visits') is null then
    raise exception 'Wrong Supabase project. Run this in project fkisefambrcyxjrwrplb (the database that contains bhi_site_visits).';
  end if;
end;
$$;

-- One source of truth for the public menu and editor.
create table if not exists public."Hotheadz_menu_defaults" (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public."Hotheadz_lunch_dates" (
  lunch_date date primary key,
  data       jsonb not null,
  saved_by   text,
  updated_at timestamptz not null default now()
);

create table if not exists public."Hotheadz_drawing_projects" (
  id         text primary key,
  name       text not null,
  data       jsonb not null,
  saved_by   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public."Hotheadz_touch_updated_at"()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists "Hotheadz_menu_defaults_touch" on public."Hotheadz_menu_defaults";
create trigger "Hotheadz_menu_defaults_touch"
before update on public."Hotheadz_menu_defaults"
for each row execute function public."Hotheadz_touch_updated_at"();

drop trigger if exists "Hotheadz_lunch_dates_touch" on public."Hotheadz_lunch_dates";
create trigger "Hotheadz_lunch_dates_touch"
before update on public."Hotheadz_lunch_dates"
for each row execute function public."Hotheadz_touch_updated_at"();

drop trigger if exists "Hotheadz_drawing_projects_touch" on public."Hotheadz_drawing_projects";
create trigger "Hotheadz_drawing_projects_touch"
before update on public."Hotheadz_drawing_projects"
for each row execute function public."Hotheadz_touch_updated_at"();

create index if not exists "Hotheadz_lunch_dates_updated_idx"
  on public."Hotheadz_lunch_dates" (updated_at desc);
create index if not exists "Hotheadz_drawing_projects_updated_idx"
  on public."Hotheadz_drawing_projects" (updated_at desc);

-- Copy the currently live Hotheadz content from the shared site_* tables.
-- Newer dedicated-table rows always win, which keeps this safe to re-run.
do $$
begin
  if to_regclass('public.site_menu_defaults') is not null then
    insert into public."Hotheadz_menu_defaults" as target (key, value, updated_at)
    select key, value, coalesce(updated_at, now())
    from public.site_menu_defaults
    where client_id = 'fb272a86-5b9e-4199-9818-fa68efc5ccd6'
    on conflict (key) do update set
      value = excluded.value,
      updated_at = excluded.updated_at
    where target.updated_at < excluded.updated_at;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.site_lunch_dates') is not null then
    insert into public."Hotheadz_lunch_dates" as target (lunch_date, data, saved_by, updated_at)
    select lunch_date, data, saved_by, coalesce(updated_at, now())
    from public.site_lunch_dates
    where client_id = 'fb272a86-5b9e-4199-9818-fa68efc5ccd6'
    on conflict (lunch_date) do update set
      data = excluded.data,
      saved_by = excluded.saved_by,
      updated_at = excluded.updated_at
    where target.updated_at < excluded.updated_at;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.site_drawing_projects') is not null then
    insert into public."Hotheadz_drawing_projects" as target
      (id, name, data, saved_by, created_at, updated_at)
    select id, name, data, saved_by, coalesce(created_at, now()), coalesce(updated_at, now())
    from public.site_drawing_projects
    where client_id = 'fb272a86-5b9e-4199-9818-fa68efc5ccd6'
    on conflict (id) do update set
      name = excluded.name,
      data = excluded.data,
      saved_by = excluded.saved_by,
      updated_at = excluded.updated_at
    where target.updated_at < excluded.updated_at;
  end if;
end;
$$;

-- Factory data is inserted only when a key is absent. Any live edits copied
-- above remain untouched.
insert into public."Hotheadz_menu_defaults" (key, value) values
  ('settings', '{"showAdvancedTab":true,"advancedDisclaimer":"Lunch posted 1-2 days early is subject to change.","advancedWindowDays":7,"noDescriptionText":"No description for this item."}'::jsonb),
  ('hours', '{"note":"","weekly":[
    {"day":"Monday","open":"6:00 AM","close":"2:00 PM","breakfast":"6:00 AM - 10:30 AM","lunch":"11:00 AM - 2:00 PM"},
    {"day":"Tuesday","open":"6:00 AM","close":"2:00 PM","breakfast":"6:00 AM - 10:30 AM","lunch":"11:00 AM - 2:00 PM"},
    {"day":"Wednesday","open":"6:00 AM","close":"2:00 PM","breakfast":"6:00 AM - 10:30 AM","lunch":"11:00 AM - 2:00 PM"},
    {"day":"Thursday","open":"6:00 AM","close":"2:00 PM","breakfast":"6:00 AM - 10:30 AM","lunch":"11:00 AM - 2:00 PM"},
    {"day":"Friday","open":"6:00 AM","close":"2:00 PM","breakfast":"6:00 AM - 10:30 AM","lunch":"11:00 AM - 2:00 PM"},
    {"day":"Saturday","open":"6:00 AM","close":"2:00 PM","breakfast":"6:00 AM - 10:30 AM","lunch":"11:00 AM - 2:00 PM"},
    {"day":"Sunday","open":"7:00 AM","close":"3:00 PM","breakfast":"7:00 AM - 10:30 AM","lunch":"11:00 AM - 3:00 PM"}
  ]}'::jsonb),
  ('closures', '{}'::jsonb),
  ('phoneTel', '"tel:3372211035"'::jsonb),
  ('deliveryNote', '"Delivery available for 10+ orders within a 10-mile radius."'::jsonb),
  ('beer', '["Natural Light","Miller Lite","Coors Light","Bud Light","Budweiser","Michelob Ultra","Corona","Modelo"]'::jsonb),
  ('breakfast', '{"subtitle":"(Same Daily - Served at opening)","plates":["Breakfast Plate - $9.99 (1 Meat)","Breakfast Plate - $11.99 (2 Meats)","Child Breakfast (10 & under) - $4.99"],"items":["Scrambled Eggs","Bacon","Sausage","Hot Links","Pancakes","French Toast Sticks","Biscuits","Hashbrowns","Cheesy Grits","Sausage Gravy","Oatmeal","BLT","Bacon, Egg and Cheese","Sausage, Egg and Cheese","Breakfast Burritos"]}'::jsonb),
  ('lunch', '{"subtitle":"(Changes Daily)","plates":["Lunch Plate - $12.99 (1 Meat, 2 Sides)","Lunch Plate - $15.99 (2 Meats, 2 Sides)","Lunch Plate - $19.99 (3 Meats, 2 Sides)","Child Lunch (10 & under) - $6.99","Extra Side - $2.99"]}'::jsonb),
  ('salad', '{"subtitle":"(Available Daily)","items":["With Meal - $4.99","Only - $8.99"],"saladBar":{"lettuce":["Romaine","Iceberg"],"toppings":["Diced tomatoes","Cucumbers","Onions","Broccoli","Carrots","Cauliflower","Peppers","Cheese","Croutons","Bacon bits","Eggs","Crackers"],"dressing":["Ranch","Thousand Island","Italian","Blue Cheese","Caesar"]}}'::jsonb),
  ('drinks', '{"items":["Coke","Diet Coke","Sprite","Dr Pepper","Sweet Tea","Unsweet Tea","Lemonade","Coffee","Milk","Orange Juice"]}'::jsonb),
  ('dessert', '{"subtitle":"(Changes Daily)","items":[]}'::jsonb),
  ('crawfish', '{"subtitle":"(Pricing is subject to change)","items":["Cooking starts at 4:00 PM and ends at 8:00 PM.","Only available Thursday - Sunday.","$5.99 per pound (subject to change).","Call to ask about crawfish availability."]}'::jsonb),
  ('sameDaily', '{"items":[{"name":"Turkey Clubs","desc":""},{"name":"Chicken Salad Croissants","desc":""}]}'::jsonb)
on conflict (key) do nothing;

-- The old factory schema did not include the Same Daily key. Repair an absent
-- or blank value so the public menu always has the intended global fallback.
update public."Hotheadz_menu_defaults"
set value = '{"items":[{"name":"Turkey Clubs","desc":""},{"name":"Chicken Salad Croissants","desc":""}]}'::jsonb
where key = 'sameDaily'
  and case
    when jsonb_typeof(value -> 'items') = 'array'
      then jsonb_array_length(value -> 'items') = 0
    else true
  end;

-- Public pages need SELECT only. All edits go through /api/menu-save with the
-- server-side service-role key; there is intentionally no anon write policy.
alter table public."Hotheadz_menu_defaults" enable row level security;
alter table public."Hotheadz_lunch_dates" enable row level security;
alter table public."Hotheadz_drawing_projects" enable row level security;

drop policy if exists "Hotheadz_public_read_menu_defaults" on public."Hotheadz_menu_defaults";
create policy "Hotheadz_public_read_menu_defaults"
  on public."Hotheadz_menu_defaults" for select to anon, authenticated using (true);

drop policy if exists "Hotheadz_public_read_lunch_dates" on public."Hotheadz_lunch_dates";
create policy "Hotheadz_public_read_lunch_dates"
  on public."Hotheadz_lunch_dates" for select to anon, authenticated using (true);

drop policy if exists "Hotheadz_public_read_drawing_projects" on public."Hotheadz_drawing_projects";
create policy "Hotheadz_public_read_drawing_projects"
  on public."Hotheadz_drawing_projects" for select to anon, authenticated using (true);

revoke all on table public."Hotheadz_menu_defaults" from anon, authenticated;
revoke all on table public."Hotheadz_lunch_dates" from anon, authenticated;
revoke all on table public."Hotheadz_drawing_projects" from anon, authenticated;

grant select on table public."Hotheadz_menu_defaults" to anon, authenticated;
grant select on table public."Hotheadz_lunch_dates" to anon, authenticated;
grant select on table public."Hotheadz_drawing_projects" to anon, authenticated;
grant all on table public."Hotheadz_menu_defaults" to service_role;
grant all on table public."Hotheadz_lunch_dates" to service_role;
grant all on table public."Hotheadz_drawing_projects" to service_role;

commit;

-- Make the new tables visible to PostgREST immediately.
notify pgrst, 'reload schema';

-- Verification result: one JSON object showing table counts and Same Daily.
select jsonb_build_object(
  'Hotheadz_menu_defaults', (select count(*) from public."Hotheadz_menu_defaults"),
  'Hotheadz_lunch_dates', (select count(*) from public."Hotheadz_lunch_dates"),
  'Hotheadz_drawing_projects', (select count(*) from public."Hotheadz_drawing_projects"),
  'sameDaily', (select value from public."Hotheadz_menu_defaults" where key = 'sameDaily')
) as "Hotheadz_sync_result";
