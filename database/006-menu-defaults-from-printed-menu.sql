-- 006-menu-defaults-from-printed-menu.sql
--
-- Loads the standing menu sections from the printed Friday menu so the studio
-- prints them without anyone retyping them, and so the AI reader no longer has
-- to pull them out of a photo every morning. Lunch is deliberately NOT here:
-- it is the one section that changes daily and comes from the draft.
--
-- Run in the SQL editor of the NorthStar/BHI Supabase project
-- (fkisefambrcyxjrwrplb). Safe to run more than once.
--
-- Each statement merges (||) into the existing value rather than replacing it,
-- so the pricing kept alongside these lists — breakfast "plates", the salad
-- "items" prices, the "subtitle" lines — survives untouched.

-- BREAKFAST (5:30 AM - 10:30 AM). The four sandwiches that used to sit in this
-- list move to sameDaily below, matching how the printed menu groups them.
update public."Hotheadz_menu_defaults"
set value = value || jsonb_build_object('items', jsonb_build_array(
  'Scrambled Eggs',
  'Bacon',
  'Sausage, Hotlinks',
  'Pancakes',
  'French Toast Sticks',
  'Biscuits',
  'Hashbrowns',
  'Cheesy Grits',
  'Grits',
  'Sausage Gravy',
  'Oatmeal'
))
where key = 'breakfast';

-- BREAKFAST SANDWICHES - Same Daily.
-- Kept as {name, desc} objects because that is the shape already stored here.
update public."Hotheadz_menu_defaults"
set value = value || jsonb_build_object('items', jsonb_build_array(
  jsonb_build_object('name', 'BLT', 'desc', ''),
  jsonb_build_object('name', 'Bacon, Egg and Cheese', 'desc', ''),
  jsonb_build_object('name', 'Sausage, Egg and Cheese', 'desc', ''),
  jsonb_build_object('name', 'Breakfast Burritos', 'desc', '')
))
where key = 'sameDaily';

-- SALAD BAR. "Iceberg" is spelled correctly here; the printed menu has
-- "Iceburg". Change it if the printed spelling is the one you want.
update public."Hotheadz_menu_defaults"
set value = value || jsonb_build_object('saladBar', jsonb_build_object(
  'lettuce', jsonb_build_array('Romaine', 'Iceberg'),
  'toppings', jsonb_build_array(
    'Diced Tomatoes', 'Cucumbers', 'Onions', 'Broccoli', 'Carrots',
    'Cauliflower', 'Peppers', 'Cheese', 'Croutons', 'Bacon Bits',
    'Eggs', 'Diced Ham', 'Crackers', 'Sunflower Seeds', 'Pickled Okra',
    'Jalapenos', 'Pickled Beets', 'Green Olives', 'Banana Peppers',
    'Pickled Green Tomatoes'
  ),
  'dressing', jsonb_build_array('Ranch', 'Italian', 'Blue Cheese', 'Caesar', 'Thousand Island')
))
where key = 'salad';

-- DRINKS.
update public."Hotheadz_menu_defaults"
set value = value || jsonb_build_object('items', jsonb_build_array(
  'Sweet Tea',
  'Unsweet Tea',
  'Dr. Pepper',
  'Rootbeer',
  'Sprite',
  'Fruit Punch',
  'Blue Powerade',
  'Diet Coke',
  'Coke Zero',
  'Coke',
  'Coffee',
  'Orange Juice',
  'Milk',
  'Chocolate Milk'
))
where key = 'drinks';

-- DESSERT.
update public."Hotheadz_menu_defaults"
set value = value || jsonb_build_object('items', jsonb_build_array('Cake'))
where key = 'dessert';

-- Verify:
-- select key, jsonb_pretty(value) from public."Hotheadz_menu_defaults"
-- where key in ('breakfast','sameDaily','salad','drinks','dessert') order by key;
