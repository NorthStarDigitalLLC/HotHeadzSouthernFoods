/**
 * HOT HEADZ SOUTHERN FOODS — Menu Data
 * ─────────────────────────────────────
 * Static menu data lives here (breakfast, drinks, salad, etc.)
 * Lunch items are fetched from Google Sheets (managed in the FB Menu Editor).
 */

const CLOUD_MENU_URL = 'https://script.google.com/macros/s/AKfycbxHd4heBpNJzAsgodKJMlgq8dVa_qlpHjIUHHRFYL6AIJys-d4x5Mxm1P_egFfvQiNtnQ/exec';

const MENU_DATA = {

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

  beer: [
    "Natural Light", "Miller Lite", "Coors Light", "Bud Light",
    "Budweiser", "Michelob Ultra", "Corona", "Modelo"
  ],

  defaults: {
    breakfast: {
      subtitle: "(Same Daily – Served at opening)",
      plates: [
        "Breakfast Plate – $9.99 (1 Meat)",
        "Breakfast Plate – $11.99 (2 Meats)",
        "Child Breakfast (10 & under) – $4.99"
      ],
      items: [
        "Scrambled Eggs", "Bacon", "Sausage", "Hot Links",
        "Pancakes", "French Toast Sticks", "Biscuits",
        "Hashbrowns", "Cheesy Grits", "Sausage Gravy",
        "Oatmeal", "BLT", "Bacon, Egg and Cheese",
        "Sausage, Egg and Cheese", "Breakfast Burritos"
      ]
    },

    lunch: {
      subtitle: "(Changes Daily)",
      plates: [
        "Lunch Plate – $12.99 (1 Meat, 2 Sides)",
        "Lunch Plate – $15.99 (2 Meats, 2 Sides)",
        "Lunch Plate – $19.99 (3 Meats, 2 Sides)",
        "Child Lunch (10 & under) – $6.99",
        "Extra Side – $2.99"
      ]
    },

    salad: {
      subtitle: "(Available Daily)",
      items: ["With Meal – $4.99", "Only – $8.99"],
      saladBar: {
        lettuce: ["Romaine", "Iceberg"],
        toppings: [
          "Diced tomatoes", "Cucumbers", "Onions", "Broccoli",
          "Carrots", "Cauliflower", "Peppers", "Cheese",
          "Croutons", "Bacon bits", "Eggs", "Crackers"
        ],
        dressing: ["Ranch", "Thousand Island", "Italian", "Blue Cheese", "Caesar"]
      }
    },

    drinks: {
      items: [
        "Coke", "Diet Coke", "Sprite", "Dr Pepper",
        "Sweet Tea", "Unsweet Tea", "Lemonade",
        "Coffee", "Milk", "Orange Juice"
      ]
    },

    dessert: {
      subtitle: "(Changes Daily)"
    },

    crawfish: {
      subtitle: "(Pricing is subject to change)",
      items: [
        "Cooking starts at 4:00 PM and ends at 8:00 PM.",
        "Only available Thursday – Sunday.",
        "$5.99 per pound (subject to change).",
        "Call to ask about crawfish availability."
      ]
    }
  },

  // Lunch dates — populated from cloud
  menus: {}
};

// Fetch ONLY lunch dates from cloud, merge into MENU_DATA.menus
(async function loadCloudLunch() {
  try {
    console.log('[Hot Headz] Fetching lunch dates from cloud...');
    const response = await fetch(CLOUD_MENU_URL + '?action=menu', { redirect: 'follow' });
    const text = await response.text();
    const result = JSON.parse(text);

    if (result.success && result.menuData && result.menuData.menus) {
      const cloudMenus = result.menuData.menus;
      const dateCount = Object.keys(cloudMenus).length;

      // Merge cloud lunch dates into MENU_DATA
      Object.keys(cloudMenus).forEach(function(date) {
        MENU_DATA.menus[date] = cloudMenus[date];
      });

      console.log('[Hot Headz] Loaded ' + dateCount + ' lunch dates from cloud');

      // Tell menu.html to re-render
      window.dispatchEvent(new CustomEvent('menuDataReady', { detail: MENU_DATA }));
    } else {
      console.log('[Hot Headz] No lunch dates in cloud yet');
    }
  } catch (err) {
    console.warn('[Hot Headz] Cloud lunch fetch failed:', err.message);
  }
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = MENU_DATA;
}
