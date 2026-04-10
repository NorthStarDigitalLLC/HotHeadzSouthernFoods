// Hot Headz Southern Foods — Menu Data
// This file is loaded by both menu.html and index.html (for the AI assistant)
// Format: MENU_DATA.menus["YYYY-MM-DD"] = { lunch, crawfish, dessert }

var MENU_DATA = {

settings: {
  advancedWindowDays: 7,
  advancedDisclaimer: "Lunch forecast — subject to change. Check Facebook every morning for confirmed specials.",
  noDescriptionText: "Ask staff for details."
},

defaults: {
  breakfast: {
    items: [
      "Biscuits & Gravy",
      "Scrambled Eggs",
      "Bacon",
      "Sausage",
      "Hash Browns",
      "Pancakes",
      "French Toast",
      "Breakfast Plate"
    ]
  },
  drinks: {
    items: [
      "Sweet Tea",
      "Unsweet Tea",
      "Lemonade",
      "Soft Drinks",
      "Coffee",
      "Water"
    ]
  }
},

beer: [
  "Natural Light",
  "Miller Lite",
  "Coors Light",
  "Bud Light",
  "Budweiser",
  "Michelob Ultra",
  "Corona",
  "Modelo"
],

closures: {},

menus: {

  "2026-04-04": {
    lunch: {
      show: true,
      items: [
        { name: "BBQ Chicken", desc: "Barbecue chicken cooked tender with bold flavor." },
        { name: "BBQ Beef", desc: "Slow-cooked beef with rich barbecue flavor." },
        { name: "Baked Beans", desc: "Slow-baked beans in a savory sauce." },
        { name: "Potato Salad", desc: "Creamy potato salad served chilled." },
        { name: "Cabbage", desc: "Tender seasoned cabbage." },
        { name: "Baked Potato Casserole", desc: "Creamy baked potato casserole loaded with flavor." },
        { name: "Corn", desc: "Sweet seasoned corn." },
        { name: "Green Beans", desc: "Seasoned green beans cooked until tender." },
        { name: "Garlic Bread", desc: "Toasted bread with buttery garlic flavor." },
        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
  },

  "2026-04-05": {
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

  "2026-04-06": {
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

  "2026-04-07": {
    lunch: {
      show: true,
      items: [
        { name: "Country Fried Steak", desc: "Breaded country fried steak served with creamy gravy." },
        { name: "Smoked Chicken", desc: "Slow-smoked chicken with rich, savory flavor." },
        { name: "Smoked Sausage with Red Gravy", desc: "Smoked sausage served with a rich red gravy." },
        { name: "Rice", desc: "Steamed white rice." },
        { name: "Mashed Potatoes & White Gravy", desc: "Creamy mashed potatoes topped with smooth white gravy." },
        { name: "Cabbage", desc: "Tender seasoned cabbage." },
        { name: "Green Beans", desc: "Seasoned green beans cooked until tender." },
        { name: "Corn", desc: "Sweet seasoned corn." },
        { name: "Fried Okra", desc: "Crispy golden fried okra." },
        { name: "Cornbread", desc: "Soft, warm cornbread baked to a golden finish." },
        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
  },

  "2026-04-08": {
    lunch: {
      show: true,
      items: [
        { name: "Chicken Enchiladas", desc: "Rolled tortillas filled with chicken and topped with savory sauce." },
        { name: "Fried Pork Chops", desc: "Crispy fried pork chops cooked until golden." },
        { name: "Taco Ring", desc: "Seasoned taco filling baked in a flaky ring crust." },
        { name: "Spanish Rice", desc: "Flavorful seasoned Spanish-style rice." },
        { name: "Mexican Corn", desc: "Sweet corn with a creamy, seasoned Mexican-style flavor." },
        { name: "Mashed Potatoes", desc: "Creamy mashed potatoes served hot." },
        { name: "Gravy", desc: "Rich gravy served over your choice of items." },
        { name: "Salsa", desc: "Fresh salsa with bold flavor." },
        { name: "Pinto Beans", desc: "Slow-cooked pinto beans with savory seasoning." },
        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
  },

  "2026-04-09": {
    lunch: {
      show: true,
      items: [

        { "name": "Hamburger Steak", "desc": "Seasoned hamburger steak cooked and served hot." },
{ "name": "Smoked Chicken", "desc": "Slow-smoked chicken with rich, savory flavor." },
{ "name": "Chicken Alfredo", "desc": "Chicken served in a creamy Alfredo sauce over pasta." },
{ "name": "Mashed Potatoes", "desc": "Creamy mashed potatoes served hot." },
{ "name": "Gravy", "desc": "Rich gravy served over your choice of items." },
{ "name": "Cabbage", "desc": "Tender seasoned cabbage." },
{ "name": "Green Beans", "desc": "Seasoned green beans cooked until tender." },
{ "name": "Black Eyed Peas", "desc": "Seasoned black eyed peas cooked low and slow." },
{ "name": "Fried Okra", "desc": "Crispy golden fried okra." },
{ "name": "Garlic Bread", "desc": "Toasted bread with buttery garlic flavor." },
        
        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
  },

  "2026-04-10": {
    lunch: {
      show: true,
      items: [
       
        { "name": "Fried Fish & Hushpuppies", "desc": "Crispy fried fish served with golden hushpuppies." },
{ "name": "Smoked Chicken", "desc": "Slow-smoked chicken with rich, savory flavor." },
{ "name": "Navy Beans", "desc": "Slow-cooked navy beans seasoned for homestyle flavor." },
{ "name": "Smothered Pork Chops", "desc": "Tender pork chops smothered in rich gravy." },
{ "name": "Corn", "desc": "Sweet seasoned corn." },
{ "name": "Cabbage", "desc": "Tender seasoned cabbage." },
{ "name": "French Fries", "desc": "Hot crispy French fries." },
{ "name": "Rice", "desc": "Steamed white rice." },
{ "name": "Greens", "desc": "Seasoned greens cooked low and slow for rich flavor." },
{ "name": "Cornbread", "desc": "Soft, warm cornbread baked to a golden finish." },
{ "name": "Baked Potato Casserole", "desc": "Creamy baked potato casserole loaded with flavor." },
        
        { name: "Turkey Clubs", desc: "Classic club sandwiches stacked with turkey, bacon, lettuce, tomato, and mayo." },
        { name: "Chicken Salad", desc: "Creamy house-made chicken salad served chilled and ready to enjoy." },
        { name: "Croissants", desc: "Flaky, buttery croissants baked until golden and tender." }
      ]
    },
    crawfish: { show: true },
    dessert: { items: ["Cake"] }
  }

}

}; // end MENU_DATA
