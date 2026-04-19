-- ═══════════════════════════════════════════════════════════════════════════
-- database-setup.sql
-- Hot Headz Southern Foods — complete Supabase database setup
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHAT THIS FILE DOES:
--   Creates the entire database schema for the Hot Headz website in one shot:
--     • 3 tables (menu_defaults, lunch_dates, drawing_projects)
--     • Auto-updating `updated_at` timestamps via triggers
--     • Row-Level Security policies (public reads + editor writes via anon key)
--     • Seeds the factory default menu content (11 rows in menu_defaults)
--
-- RUN IN:
--   Supabase Dashboard → SQL Editor → New Query → paste this file → Run
--
-- WHEN TO RUN:
--   • Once, when first setting up a fresh Supabase project.
--   • Again if you ever need to rebuild the database from scratch
--     (new Supabase project, disaster recovery, cloning to staging, etc.)
--
-- SAFE TO RE-RUN?
--   Mostly yes — uses `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING`
--   so existing tables and rows are untouched. Policies are dropped and
--   recreated, which is safe. However, edits to seed data here will NOT
--   overwrite existing live data — you'd need to UPDATE those rows directly
--   or use the menu editor UI.
--
-- SECURITY MODEL:
--   All tables have Row-Level Security (RLS) enabled. The anon key (which is
--   public in menu.html) has both read and write access. Real protection
--   comes from:
--     • The PIN gate on menu-editor.html
--     • The editor being at an unlisted URL (not linked from homepage)
--     • Supabase's built-in rate limiting on anon requests
--     • Supabase's automatic daily backups (free tier)
--
--   To harden further later, switch the write policies from `TO anon` to
--   `TO authenticated` and add Supabase Auth (email/password login) to the
--   editor.
--
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── TABLES ────────────────────────────────────────────────────────────────

-- Static menu content (breakfast items, beer list, hours, settings, etc.)
-- Key/value store. One row per category.
CREATE TABLE IF NOT EXISTS menu_defaults (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Daily-changing lunch forecast. One row per date.
CREATE TABLE IF NOT EXISTS lunch_dates (
  lunch_date  DATE PRIMARY KEY,
  data        JSONB NOT NULL,
  saved_by    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Saved canvas drawings from the menu editor.
-- Uses TEXT id (not UUID) so the editor's client-generated uids work as-is.
CREATE TABLE IF NOT EXISTS drawing_projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  data        JSONB NOT NULL,
  saved_by    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─── AUTO-UPDATING TIMESTAMPS ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_menu_defaults ON menu_defaults;
CREATE TRIGGER set_timestamp_menu_defaults
  BEFORE UPDATE ON menu_defaults
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_lunch_dates ON lunch_dates;
CREATE TRIGGER set_timestamp_lunch_dates
  BEFORE UPDATE ON lunch_dates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_drawing_projects ON drawing_projects;
CREATE TRIGGER set_timestamp_drawing_projects
  BEFORE UPDATE ON drawing_projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- ─── ROW-LEVEL SECURITY ────────────────────────────────────────────────────

ALTER TABLE menu_defaults    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_dates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_projects ENABLE ROW LEVEL SECURITY;

-- menu_defaults: anon can read and write
DROP POLICY IF EXISTS "public_read_menu_defaults" ON menu_defaults;
CREATE POLICY "public_read_menu_defaults"
  ON menu_defaults FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_write_menu_defaults" ON menu_defaults;
CREATE POLICY "anon_write_menu_defaults"
  ON menu_defaults FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- lunch_dates: anon can read and write
DROP POLICY IF EXISTS "public_read_lunch_dates" ON lunch_dates;
CREATE POLICY "public_read_lunch_dates"
  ON lunch_dates FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_write_lunch_dates" ON lunch_dates;
CREATE POLICY "anon_write_lunch_dates"
  ON lunch_dates FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- drawing_projects: anon can read and write
DROP POLICY IF EXISTS "anon_read_drawing_projects" ON drawing_projects;
CREATE POLICY "anon_read_drawing_projects"
  ON drawing_projects FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_write_drawing_projects" ON drawing_projects;
CREATE POLICY "anon_write_drawing_projects"
  ON drawing_projects FOR ALL TO anon
  USING (true) WITH CHECK (true);


-- ─── SEED FACTORY DEFAULTS ─────────────────────────────────────────────────
-- 11 rows matching the hardcoded fallback in menu.html so the public menu
-- has something to show before any staff edits are made.

INSERT INTO menu_defaults (key, value) VALUES
  ('settings', '{"showAdvancedTab": true, "advancedDisclaimer": "Lunch posted 1–2 days early is subject to change.", "advancedWindowDays": 7, "noDescriptionText": "No description for this item."}'::jsonb),
  ('hours', '{"note": "", "weekly": [
    {"day":"Monday","open":"5:30 AM","close":"2:00 PM","breakfast":"5:30 AM – 10:30 AM","lunch":"11:00 AM – 2:00 PM"},
    {"day":"Tuesday","open":"5:30 AM","close":"2:00 PM","breakfast":"5:30 AM – 10:30 AM","lunch":"11:00 AM – 2:00 PM"},
    {"day":"Wednesday","open":"5:30 AM","close":"2:00 PM","breakfast":"5:30 AM – 10:30 AM","lunch":"11:00 AM – 2:00 PM"},
    {"day":"Thursday","open":"5:30 AM","close":"2:00 PM","breakfast":"5:30 AM – 10:30 AM","lunch":"11:00 AM – 2:00 PM"},
    {"day":"Friday","open":"5:30 AM","close":"2:00 PM","breakfast":"5:30 AM – 10:30 AM","lunch":"11:00 AM – 2:00 PM"},
    {"day":"Saturday","open":"6:00 AM","close":"2:00 PM","breakfast":"6:00 AM – 10:30 AM","lunch":"11:00 AM – 2:00 PM"},
    {"day":"Sunday","open":"7:00 AM","close":"3:00 PM","breakfast":"7:00 AM – 10:30 AM","lunch":"11:00 AM – 3:00 PM"}
  ]}'::jsonb),
  ('closures', '{}'::jsonb),
  ('phoneTel', '"tel:3372211035"'::jsonb),
  ('deliveryNote', '"Delivery available for 10+ orders within a 10-mile radius."'::jsonb),
  ('beer', '["Natural Light","Miller Lite","Coors Light","Bud Light","Budweiser","Michelob Ultra","Corona","Modelo"]'::jsonb),
  ('breakfast', '{"subtitle": "(Same Daily – Served at opening)", "plates": ["Breakfast Plate – $9.99 (1 Meat)","Breakfast Plate – $11.99 (2 Meats)","Child Breakfast (10 & under) – $4.99"], "items": ["Scrambled Eggs","Bacon","Sausage","Hot Links","Pancakes","French Toast Sticks","Biscuits","Hashbrowns","Cheesy Grits","Sausage Gravy","Oatmeal","BLT","Bacon, Egg and Cheese","Sausage, Egg and Cheese","Breakfast Burritos"]}'::jsonb),
  ('lunch', '{"subtitle": "(Changes Daily)", "plates": ["Lunch Plate – $12.99 (1 Meat, 2 Sides)","Lunch Plate – $15.99 (2 Meats, 2 Sides)","Lunch Plate – $19.99 (3 Meats, 2 Sides)","Child Lunch (10 & under) – $6.99","Extra Side – $2.99"]}'::jsonb),
  ('salad', '{"subtitle": "(Available Daily)", "items": ["With Meal – $4.99","Only – $8.99"], "saladBar": {"lettuce": ["Romaine","Iceberg"], "toppings": ["Diced tomatoes","Cucumbers","Onions","Broccoli","Carrots","Cauliflower","Peppers","Cheese","Croutons","Bacon bits","Eggs","Crackers"], "dressing": ["Ranch","Thousand Island","Italian","Blue Cheese","Caesar"]}}'::jsonb),
  ('drinks', '{"items": ["Coke","Diet Coke","Sprite","Dr Pepper","Sweet Tea","Unsweet Tea","Lemonade","Coffee","Milk","Orange Juice"]}'::jsonb),
  ('dessert', '{"subtitle": "(Changes Daily)", "items": []}'::jsonb),
  ('crawfish', '{"subtitle": "(Pricing is subject to change)", "items": ["Cooking starts at 4:00 PM and ends at 8:00 PM.","Only available Thursday – Sunday.","$5.99 per pound (subject to change).","Call to ask about crawfish availability."]}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ─── VERIFY ────────────────────────────────────────────────────────────────
-- Uncomment and run these to confirm everything is set up correctly:
--
--   SELECT key FROM menu_defaults ORDER BY key;
--   -- Expected: 11 rows (beer, breakfast, closures, crawfish, dessert,
--   --            drinks, hours, lunch, phoneTel, salad, settings)
--
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' ORDER BY tablename, policyname;
--   -- Expected: 7 policies across 3 tables
--
--   SELECT table_name, column_name, data_type FROM information_schema.columns
--   WHERE table_schema = 'public' AND column_name = 'id';
--   -- Expected: drawing_projects.id is "text" (not "uuid")
