/**
 * HOT HEADZ SOUTHERN FOODS — Menu Data (Cloud-Powered)
 * ─────────────────────────────────────────────────────
 * This file fetches menu data from the Google Sheet managed
 * by the FB Menu Editor. Falls back to defaults if cloud fails.
 *
 * The editor saves: hours, breakfast, lunch per date, drinks,
 * salad bar, dessert, crawfish, beer, closures, settings.
 * This file reads it all and provides MENU_DATA to menu.html.
 */

const CLOUD_MENU_URL = 'https://script.google.com/macros/s/AKfycbxHd4heBpNJzAsgodKJMlgq8dVa_qlpHjIUHHRFYL6AIJys-d4x5Mxm1P_egFfvQiNtnQ/exec';

// Default data (used if cloud is unreachable)
const MENU_DATA_DEFAULTS = {
  settings: {
    showAdvancedTab: true,
    advancedDisclaimer: "Lunch posted 1–2 days early is subject to change.",
    advancedWindowDays: 7,
    noDescriptionText: "No description for this item.",
    modelBasePath: "models/",
    modelExtension: ".glb"
  },
  hours: {
    note: "",
    weekly: [
      { day: "Monday",    open: "5:30 AM", close: "2:00 PM", breakfast: "5:30 AM – 10:30 AM", lunch: "11:00 AM – 2:00 PM" },
      { day: "Tuesday",   open: "5:30 AM", close: "2:00 PM", breakfast: "5:30 AM – 10:30 AM", lunch: "11:00 AM – 2:00 PM" },
      { day: "Wednesday", open: "5:30 AM", close: "2:00 PM", breakfast: "5:30 AM – 10:30 AM", lunch: "11:00 AM – 2:00 PM" },
      { day: "Thursday",  open: "5:30 AM", close: "2:00 PM", breakfast: "5:30 AM – 10:30 AM", lunch: "11:00 AM – 2:00 PM" },
      { day: "Friday",    open: "5:30 AM", close: "2:00 PM", breakfast: "5:30 AM – 10:30 AM", lunch: "11:00 AM – 2:00 PM" },
      { day: "Saturday",  open: "6:00 AM", close: "2:00 PM", breakfast: "6:00 AM – 10:30 AM", lunch: "11:00 AM – 2:00 PM" },
      { day: "Sunday",    open: "7:00 AM", close: "3:00 PM", breakfast: "7:00 AM – 10:30 AM", lunch: "11:00 AM – 3:00 PM" }
    ]
  },
  closures: {},
  phoneTel: "tel:3372211035",
  deliveryNote: "Delivery available for 10+ orders within a 10-mile radius.",
  beer: ["Natural Light", "Miller Lite", "Coors Light", "Bud Light", "Budweiser", "Michelob Ultra", "Corona", "Modelo"],
  defaults: {
    breakfast: {
      subtitle: "(Same Daily – Served at opening)",
      plates: ["Breakfast Plate – $9.99 (1 Meat)", "Breakfast Plate – $11.99 (2 Meats)", "Child Breakfast (10 & under) – $4.99"],
      items: ["Scrambled Eggs", "Bacon", "Sausage", "Hot Links", "Pancakes", "French Toast Sticks", "Biscuits", "Hashbrowns", "Cheesy Grits", "Sausage Gravy", "Oatmeal", "BLT", "Bacon, Egg and Cheese", "Sausage, Egg and Cheese", "Breakfast Burritos"]
    },
    lunch: {
      subtitle: "(Changes Daily)",
      plates: ["Lunch Plate – $12.99 (1 Meat, 2 Sides)", "Lunch Plate – $15.99 (2 Meats, 2 Sides)", "Lunch Plate – $19.99 (3 Meats, 2 Sides)", "Child Lunch (10 & under) – $6.99", "Extra Side – $2.99"]
    },
    salad: {
      subtitle: "(Available Daily)",
      items: ["With Meal – $4.99", "Only – $8.99"],
      saladBar: {
        lettuce: ["Romaine", "Iceberg"],
        toppings: ["Diced tomatoes", "Cucumbers", "Onions", "Broccoli", "Carrots", "Cauliflower", "Peppers", "Cheese", "Croutons", "Bacon bits", "Eggs", "Crackers"],
        dressing: ["Ranch", "Thousand Island", "Italian", "Blue Cheese", "Caesar"]
      }
    },
    drinks: { items: ["Coke", "Diet Coke", "Sprite", "Dr Pepper", "Sweet Tea", "Unsweet Tea", "Lemonade", "Coffee", "Milk", "Orange Juice"] },
    dessert: { subtitle: "(Changes Daily)" },
    crawfish: {
      subtitle: "(Pricing is subject to change)",
      items: ["Cooking starts at 4:00 PM and ends at 8:00 PM.", "Only available Thursday – Sunday.", "$5.99 per pound (subject to change).", "Call to ask about crawfish availability."]
    }
  },
  menus: {}
};

// Global that menu.html reads
let MENU_DATA = JSON.parse(JSON.stringify(MENU_DATA_DEFAULTS));

// Attempt to fetch cloud data and merge
(async function loadCloudMenu() {
  try {
    const response = await fetch(CLOUD_MENU_URL + '?action=menu', { redirect: 'follow' });
    const text = await response.text();
    const result = JSON.parse(text);
    
    if (result.success && result.menuData) {
      const cloud = result.menuData;
      
      // Merge cloud data over defaults (cloud wins where it has data)
      if (cloud.settings && Object.keys(cloud.settings).length) MENU_DATA.settings = { ...MENU_DATA.settings, ...cloud.settings };
      if (cloud.hours && (cloud.hours.weekly?.length || cloud.hours.note)) MENU_DATA.hours = cloud.hours;
      if (cloud.closures && Object.keys(cloud.closures).length) MENU_DATA.closures = cloud.closures;
      if (cloud.beer && cloud.beer.length) MENU_DATA.beer = cloud.beer;
      
      // Defaults
      if (cloud.defaults) {
        const cd = cloud.defaults;
        if (cd.breakfast && (cd.breakfast.items?.length || cd.breakfast.plates?.length)) MENU_DATA.defaults.breakfast = { ...MENU_DATA.defaults.breakfast, ...cd.breakfast };
        if (cd.lunch && cd.lunch.plates?.length) MENU_DATA.defaults.lunch = { ...MENU_DATA.defaults.lunch, ...cd.lunch };
        if (cd.salad && (cd.salad.items?.length || cd.salad.saladBar)) MENU_DATA.defaults.salad = { ...MENU_DATA.defaults.salad, ...cd.salad };
        if (cd.drinks && cd.drinks.items?.length) MENU_DATA.defaults.drinks = cd.drinks;
        if (cd.dessert && (cd.dessert.items?.length || cd.dessert.subtitle)) MENU_DATA.defaults.dessert = { ...MENU_DATA.defaults.dessert, ...cd.dessert };
        if (cd.crawfish && (cd.crawfish.items?.length || cd.crawfish.subtitle)) MENU_DATA.defaults.crawfish = { ...MENU_DATA.defaults.crawfish, ...cd.crawfish };
      }
      
      // Per-date menus (lunch forecast)
      if (cloud.menus && Object.keys(cloud.menus).length) {
        MENU_DATA.menus = { ...MENU_DATA.menus, ...cloud.menus };
      }
      
      console.log('[Hot Headz] Cloud menu loaded successfully');
      
      // Dispatch event so menu.html knows data is ready
      window.dispatchEvent(new CustomEvent('menuDataReady', { detail: MENU_DATA }));
    }
  } catch (err) {
    console.warn('[Hot Headz] Cloud menu fetch failed, using defaults:', err.message);
  }
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = MENU_DATA;
}
