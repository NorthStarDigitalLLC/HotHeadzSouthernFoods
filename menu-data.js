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

    "2026-03-28": {
      lunch: {
        show: true,
        items: [
          { name: "BBQ Chicken", desc: "Barbecue chicken cooked tender with bold flavor." },
          { name: "Bacon Wrapped Tenderloin", desc: "Juicy tenderloin wrapped in bacon and cooked to perfection." },
          { name: "BBQ Beef Burgers", desc: "Grilled beef burgers topped with bold barbecue flavor." },
          { name: "Cabbage", desc: "Tender seasoned cabbage." },
          { name: "Greens", desc: "Seasoned greens cooked low and slow for rich flavor." },
          { name: "Corn", desc: "Sweet seasoned corn." },
          { name: "Potato Salad", desc: "Creamy potato salad served chilled." },
          { name: "Okra & Tomatoes", desc: "Classic southern-style okra and tomatoes cooked together." },
          { name: "Green Beans", desc: "Seasoned green beans cooked until tender." },
          { name: "Garlic Bread", desc: "Toasted bread with buttery garlic flavor." },
          { name: "French Fries", desc: "Hot crispy French fries." },
          { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
          { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
          { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
        ]
      },
      crawfish: { show: true },
      dessert: { items: ["Cake"] }
    },

    "2026-03-29": {
      lunch: {
        show: true,
        items: [
          { name: "Meatloaf", desc: "Homestyle baked meatloaf seasoned and cooked to perfection." },
          { name: "Shrimp Creole", desc: "Shrimp cooked in a rich, flavorful creole sauce." },
          { name: "Fried Chicken Tenders", desc: "Crispy fried chicken tenders cooked until golden." },
          { name: "Sweet Potato Casserole", desc: "Sweet and creamy sweet potato casserole baked to perfection." },
          { name: "Mashed Potatoes & Gravy", desc: "Creamy mashed potatoes topped with rich gravy." },
          { name: "Cabbage", desc: "Tender seasoned cabbage." },
          { name: "Green Beans", desc: "Seasoned green beans cooked until tender." },
          { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
          { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
          { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
        ]
      },
      crawfish: { show: true },
      dessert: { items: ["Cake"] }
    },

    "2026-03-30": {
      lunch: {
        show: true,
        items: [
          { name: "Tomato", desc: "Fresh sliced tomatoes." }
        ]
      },
      crawfish: { show: true },
      dessert: { items: ["Cake"] }
    },

    "2026-03-31": {
      lunch: {
        show: true,
        items: [
          { name: "Tomatoes", desc: "Fresh sliced tomatoes." }
        ]
      },
      crawfish: { show: true },
      dessert: { items: ["Cake"] }
    },

    "2026-04-01": {
      lunch: {
        show: true,
        items: [
          { name: "Tomatoes", desc: "Fresh sliced tomatoes." }
        ]
      },
      crawfish: { show: true },
      dessert: { items: ["Cake"] }
    },

    "2026-04-02": {
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

    "2026-04-03": {
      lunch: {
        show: true,
        items: [
          { name: "Corn Nuggets", desc: "Sweet corn fritters fried to a crispy golden bite." },
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
