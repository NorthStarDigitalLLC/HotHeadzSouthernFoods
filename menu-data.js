/**
 * HOT HEADZ SOUTHERN FOODS — Menu Data
 * ─────────────────────────────────────
 * Edit this file to update the menu.
 *
 * HOW IT WORKS:
 *   • Add items to a date's lunch → the menu page shows them automatically.
 *   • 3D models: name your .glb file to match the item name (lowercase, spaces → hyphens).
 *     Example: "Meatloaf" → models/meatloaf.glb
 *              "Fried Chicken Tenders" → models/fried-chicken-tenders.glb
 *   • If no .glb file exists, a placeholder icon is shown instead.
 */

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

  closures: {
    // "Sunday": { closed: true, message: "Closed for the holiday!" }
  },

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

  menus: {

    "2026-04-11": {
    lunch: {
      show: true,
      items: [

        { "name": "BBQ Chicken", "desc": "Barbecue chicken cooked tender with bold flavor." },
{ "name": "Smothered PorkChops", "desc": "Juicy pork tenderloin wrapped in bacon and cooked to perfection." },
{ "name": "BBQ Beef", "desc": "Slow-cooked beef with rich barbecue flavor." },
{ "name": "Baked Beans", "desc": "Slow-baked beans in a savory sauce." },
{ "name": "Potato Salad", "desc": "Creamy potato salad served chilled." },
{ "name": "Cabbage", "desc": "Tender seasoned cabbage." },
{ "name": "Baked Potato Casserole", "desc": "Creamy baked potato casserole loaded with flavor." },
{ "name": "Corn", "desc": "Sweet seasoned corn." },
{ "name": "Green Beans", "desc": "Seasoned green beans cooked until tender." },
{ "name": "Garlic Bread", "desc": "Toasted bread with buttery garlic flavor." },

        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
  },

  "2026-04-12": {
    lunch: {
      show: true,
      items: [

        { "name": "Meatloaf", "desc": "Homestyle baked meatloaf seasoned and cooked to perfection." },
{ "name": "Fried Chicken Tenders", "desc": "Crispy fried chicken tenders cooked until golden." },
{ "name": "Pork Roast Gravy", "desc": "Slow-cooked pork roast served with rich, savory gravy." },
{ "name": "French Fries", "desc": "Hot crispy French fries." },
{ "name": "Rice", "desc": "Steamed white rice." },
{ "name": "Mashed Potatoes", "desc": "Creamy mashed potatoes served hot." },
{ "name": "Fried Okra", "desc": "Crispy golden fried okra." },
{ "name": "Greens", "desc": "Seasoned greens cooked low and slow for rich flavor." },
{ "name": "Corn", "desc": "Sweet seasoned corn." },
{ "name": "Black Eyed Peas", "desc": "Seasoned black eyed peas cooked low and slow." },
{ "name": "Cornbread", "desc": "Soft, warm cornbread baked to a golden finish." },

        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
  },

  "2026-04-13": {
    lunch: {
      show: true,
      items: [

        { "name": "Beef Tips", "desc": "Tender beef tips cooked in a savory gravy." },
{ "name": "Red Beans & Rice", "desc": "Slow-cooked red beans served over seasoned rice." },
{ "name": "BBQ Chicken", "desc": "Barbecue chicken cooked tender with bold flavor." },
{ "name": "Mashed Potatoes & Gravy", "desc": "Creamy mashed potatoes topped with rich gravy." },
{ "name": "Cabbage", "desc": "Tender seasoned cabbage." },
{ "name": "Green Beans", "desc": "Seasoned green beans cooked until tender." },
{ "name": "Corn", "desc": "Sweet seasoned corn." },
{ "name": "Rolls", "desc": "Soft rolls served warm." },
{ "name": "Fried Okra", "desc": "Crispy golden fried okra." },
{ "name": "Turkey Clubs", "desc": "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
{ "name": "Chicken Salad", "desc": "Creamy house-made chicken salad served chilled and ready to enjoy." },
{ "name": "Croissants", "desc": "Flaky, buttery croissants baked until golden and tender." },

        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
  },

  "2026-04-14": {
    lunch: {
      show: true,
      items: [
        

        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
  },

  "2026-04-15": {
    lunch: {
      show: true,
      items: [
        

        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
  },

  "2026-04-16": {
    lunch: {
      show: true,
      items: [
        

        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
  },

  "2026-04-17": {
    lunch: {
      show: true,
      items: [
        

        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
    }
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = MENU_DATA;
}
