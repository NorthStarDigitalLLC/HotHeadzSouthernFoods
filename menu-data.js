/**
 * HOT HEADZ SOUTHERN FOODS — Menu Data (Cloud Only)
 * ──────────────────────────────────────────────────
 * ALL menu data lives in Google Sheets.
 * This file fetches it and provides MENU_DATA to menu.html.
 * If cloud is unreachable, shows empty/loading state.
 */

const CLOUD_MENU_URL = 'https://script.google.com/macros/s/AKfycbxHd4heBpNJzAsgodKJMlgq8dVa_qlpHjIUHHRFYL6AIJys-d4x5Mxm1P_egFfvQiNtnQ/exec';

// Bare minimum structure so menu.html doesn't crash before cloud loads
let MENU_DATA = {
  settings: {
    showAdvancedTab: true,
    advancedDisclaimer: "Lunch posted 1–2 days early is subject to change.",
    advancedWindowDays: 7,
    noDescriptionText: "No description for this item."
  },
  hours: { note: "", weekly: [] },
  closures: {},
  phoneTel: "tel:3372211035",
  deliveryNote: "Delivery available for 10+ orders within a 10-mile radius.",
  beer: [],
  defaults: {
    breakfast: { subtitle: "", plates: [], items: [] },
    lunch: { subtitle: "", plates: [] },
    salad: { subtitle: "", items: [], saladBar: { lettuce: [], toppings: [], dressing: [] } },
    drinks: { items: [] },
    dessert: { subtitle: "", items: [] },
    crawfish: { subtitle: "", items: [] }
  },
  menus: {}
};

// Fetch everything from Google Sheets
(async function loadCloudMenu() {
  try {
    console.log('[Hot Headz] Fetching menu from cloud...');
    const response = await fetch(CLOUD_MENU_URL + '?action=menu', { redirect: 'follow' });
    const text = await response.text();
    const result = JSON.parse(text);

    if (result.success && result.menuData) {
      const cloud = result.menuData;

      // Replace MENU_DATA entirely with cloud data
      if (cloud.settings) MENU_DATA.settings = { ...MENU_DATA.settings, ...cloud.settings };
      if (cloud.hours) MENU_DATA.hours = cloud.hours;
      if (cloud.closures) MENU_DATA.closures = cloud.closures;
      if (cloud.beer) MENU_DATA.beer = cloud.beer;
      if (cloud.defaults) {
        if (cloud.defaults.breakfast) MENU_DATA.defaults.breakfast = cloud.defaults.breakfast;
        if (cloud.defaults.lunch) MENU_DATA.defaults.lunch = cloud.defaults.lunch;
        if (cloud.defaults.salad) MENU_DATA.defaults.salad = cloud.defaults.salad;
        if (cloud.defaults.drinks) MENU_DATA.defaults.drinks = cloud.defaults.drinks;
        if (cloud.defaults.dessert) MENU_DATA.defaults.dessert = cloud.defaults.dessert;
        if (cloud.defaults.crawfish) MENU_DATA.defaults.crawfish = cloud.defaults.crawfish;
      }
      if (cloud.menus) MENU_DATA.menus = cloud.menus;

      console.log('[Hot Headz] Cloud menu loaded —', Object.keys(cloud.menus || {}).length, 'lunch dates');

      // Tell menu.html to re-render with the cloud data
      window.dispatchEvent(new CustomEvent('menuDataReady', { detail: MENU_DATA }));
    } else {
      console.warn('[Hot Headz] Cloud returned unexpected response:', result);
    }
  } catch (err) {
    console.warn('[Hot Headz] Cloud fetch failed:', err.message);
    console.warn('[Hot Headz] Make sure Apps Script v4 is deployed with ?action=menu support');
  }
})();
