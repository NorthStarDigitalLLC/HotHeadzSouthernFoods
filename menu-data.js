/**
 * HOT HEADZ SOUTHERN FOODS — Menu Data
 * Static data here. Lunch fetched from Google Sheets via fetch.
 */
var CLOUD_URL = 'https://script.google.com/macros/s/AKfycbxHd4heBpNJzAsgodKJMlgq8dVa_qlpHjIUHHRFYL6AIJys-d4x5Mxm1P_egFfvQiNtnQ/exec';

var MENU_DATA = {
  settings: {
    showAdvancedTab: true,
    advancedDisclaimer: "Lunch posted 1–2 days early is subject to change.",
    advancedWindowDays: 7,
    noDescriptionText: "No description for this item."
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
  beer: ["Natural Light","Miller Lite","Coors Light","Bud Light","Budweiser","Michelob Ultra","Corona","Modelo"],
  defaults: {
    breakfast: {
      subtitle: "(Same Daily – Served at opening)",
      plates: ["Breakfast Plate – $9.99 (1 Meat)","Breakfast Plate – $11.99 (2 Meats)","Child Breakfast (10 & under) – $4.99"],
      items: ["Scrambled Eggs","Bacon","Sausage","Hot Links","Pancakes","French Toast Sticks","Biscuits","Hashbrowns","Cheesy Grits","Sausage Gravy","Oatmeal","BLT","Bacon, Egg and Cheese","Sausage, Egg and Cheese","Breakfast Burritos"]
    },
    lunch: {
      subtitle: "(Changes Daily)",
      plates: ["Lunch Plate – $12.99 (1 Meat, 2 Sides)","Lunch Plate – $15.99 (2 Meats, 2 Sides)","Lunch Plate – $19.99 (3 Meats, 2 Sides)","Child Lunch (10 & under) – $6.99","Extra Side – $2.99"]
    },
    salad: {
      subtitle: "(Available Daily)",
      items: ["With Meal – $4.99","Only – $8.99"],
      saladBar: {
        lettuce: ["Romaine","Iceberg"],
        toppings: ["Diced tomatoes","Cucumbers","Onions","Broccoli","Carrots","Cauliflower","Peppers","Cheese","Croutons","Bacon bits","Eggs","Crackers"],
        dressing: ["Ranch","Thousand Island","Italian","Blue Cheese","Caesar"]
      }
    },
    drinks: { items: ["Coke","Diet Coke","Sprite","Dr Pepper","Sweet Tea","Unsweet Tea","Lemonade","Coffee","Milk","Orange Juice"] },
    dessert: { subtitle: "(Changes Daily)" },
    crawfish: {
      subtitle: "(Pricing is subject to change)",
      items: ["Cooking starts at 4:00 PM and ends at 8:00 PM.","Only available Thursday – Sunday.","$5.99 per pound (subject to change).","Call to ask about crawfish availability."]
    }
  },
  menus: {}
};

// Fetch lunch from cloud
(function () {
  console.log('[HH] Fetching lunch data from cloud...');

  fetch(CLOUD_URL + '?action=lunch&_ts=' + Date.now(), {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store'
  })
    .then(function (r) {
      if (!r.ok) {
        throw new Error('HTTP ' + r.status);
      }
      return r.text();
    })
    .then(function (text) {
      console.log('[HH] Raw lunch response:', text);

      var result = JSON.parse(text);

      if (result && result.success && result.dates && typeof result.dates === 'object') {
        Object.keys(result.dates).forEach(function (key) {
          MENU_DATA.menus[key] = result.dates[key];
        });

        console.log('[HH] Loaded ' + Object.keys(result.dates).length + ' lunch dates:', Object.keys(result.dates).join(', '));
      } else {
        console.warn('[HH] Cloud returned unexpected lunch payload:', result);
      }

      window.dispatchEvent(new CustomEvent('menuDataReady', { detail: MENU_DATA }));
    })
    .catch(function (err) {
      console.warn('[HH] Lunch fetch failed:', err.message);
      window.dispatchEvent(new CustomEvent('menuDataReady', { detail: MENU_DATA }));
    });
})();
