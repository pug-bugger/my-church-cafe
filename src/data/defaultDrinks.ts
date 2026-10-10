import { Drink, DrinkOption, DrinkOptionValue } from "@/types";

/**
 * The offline fallback menu, so plain labels are enough — nothing here carries
 * a surcharge, and the real catalogue's prices come from the API.
 */
const choices = (...labels: string[]): DrinkOptionValue[] =>
  labels.map((label) => ({ label, extraPrice: 0 }));

const defaultOptions: Record<string, DrinkOption> = {
  coffeeSize: {
    id: "size-1",
    name: "Size",
    type: "size",
    values: choices("Small (230ml)", "Medium (350ml)", "Large (470ml)"),
  },
  temperature: {
    id: "temp-1",
    name: "Temperature",
    type: "temperature",
    values: choices("Hot", "Iced"),
  },
  sugarLevel: {
    id: "sugar-1",
    name: "Sugar",
    type: "sugar",
    values: choices("No Sugar", "Light Sweet", "Regular Sweet", "Extra Sweet"),
  },
  milkType: {
    id: "milk-1",
    name: "Milk",
    type: "custom",
    values: choices("Whole Milk", "2% Milk", "Oat Milk", "Almond Milk", "No Milk"),
  },
  espressoShots: {
    id: "shots-1",
    name: "Espresso Shots",
    type: "custom",
    values: choices("Single", "Double", "Triple"),
  },
  whippedCream: {
    id: "whip-1",
    name: "Whipped Cream",
    type: "checkbox",
    values: choices(),
    defaultValue: false,
  },
  syrupFlavor: {
    id: "syrup-1",
    name: "Syrup Flavor",
    type: "custom",
    values: choices("No Syrup", "Vanilla", "Caramel", "Hazelnut", "Chocolate"),
  },
  cupType: {
    id: "cup-1",
    name: "Take away",
    type: "checkbox",
    values: choices(),
    defaultValue: false,
  },
};

export const defaultDrinks: Drink[] = [
  {
    id: "coffee-1",
    name: "Espresas",
    secondaryName: "Эспрессо",
    description: "Our signature blend, rich and smooth",
    price: 1.50,
    imageUrl: "/drinks/house-coffee.jpg",
    availableOptions: [
      // defaultOptions.coffeeSize,
      // defaultOptions.temperature,
      // defaultOptions.milkType,
      defaultOptions.cupType,
    ],
  },
  {
    id: "coffee-2",
    name: "Dvigubas espresas",
    secondaryName: "Двойной эспрессо",
    description: "Pure and strong Italian-style espresso",
    price: 2.00,
    iconName: "coffee",
    availableOptions: [
      // defaultOptions.espressoShots,
      defaultOptions.cupType,
    ],
  },
  {
    id: "coffee-3",
    name: "Amerikano",
    secondaryName: "Американо",
    description: "Equal parts espresso, steamed milk, and milk foam",
    price: 1.50,
    imageUrl: "cappuccino",
    availableOptions: [
      // defaultOptions.coffeeSize,
      // defaultOptions.espressoShots,
      defaultOptions.cupType,
      defaultOptions.milkType,
    ],
  },
  {
    id: "coffee-4",
    name: "Lungo",
    secondaryName: "Лунго",
    description: "Espresso with steamed milk and a light layer of foam",
    price: 1.50,
    imageUrl: "/drinks/latte.jpg",
    availableOptions: [
      // defaultOptions.coffeeSize,
      // defaultOptions.temperature,
      // defaultOptions.espressoShots,
      defaultOptions.cupType,
      defaultOptions.milkType,
      // defaultOptions.syrupFlavor,
    ],
  },
  // {
  //   id: "coffee-5",
  //   name: "Makiatas",
  //   secondaryName: "Макиато",
  //   description: "Espresso with chocolate, steamed milk, and whipped cream",
  //   price: 4.25,
  //   imageUrl: "/drinks/mocha.jpg",
  //   availableOptions: [
  //     // defaultOptions.coffeeSize,
  //     // defaultOptions.temperature,
  //     // defaultOptions.espressoShots,
  //     defaultOptions.cupType,
  //     defaultOptions.milkType,
  //     // defaultOptions.whippedCream,
  //   ],
  // },
  {
    id: "coffee-6",
    name: "Kortadas",
    secondaryName: "Кортадо",
    description: "Espresso diluted with hot water",
    price: 2.00,
    imageUrl: "/drinks/americano.jpg",
    availableOptions: [
      // defaultOptions.coffeeSize,
      // defaultOptions.temperature,
      // defaultOptions.espressoShots,
      defaultOptions.cupType,
    ],
  },
  {
    id: "coffee-7",
    name: "Latė",
    secondaryName: "Кофе латте",
    description: "Vanilla-flavored drink marked with espresso and caramel",
    price: 2.00,
    imageUrl: "/drinks/caramel-macchiato.jpg",
    availableOptions: [
      // defaultOptions.coffeeSize,
      // defaultOptions.temperature,
      // defaultOptions.espressoShots,
      defaultOptions.cupType,
      defaultOptions.milkType,
      // defaultOptions.whippedCream,
    ],
  },
  {
    id: "coffee-8",
    name: "Kapučinas",
    secondaryName: "Капучино",
    description: "Smooth, cold-steeped coffee served over ice",
    price: 2.00,
    imageUrl: "/drinks/cold-brew.jpg",
    availableOptions: [
      // defaultOptions.coffeeSize,
      defaultOptions.cupType,
      defaultOptions.milkType,
    ],
  },
  {
    id: "coffee-9",
    name: "Flat White",
    secondaryName: "Флэт Уайт",
    description: "Smooth, cold-steeped coffee served over ice",
    price: 2.50,
    imageUrl: "/drinks/cold-brew.jpg",
    availableOptions: [
      // defaultOptions.coffeeSize,
      defaultOptions.cupType,
      defaultOptions.milkType,
    ],
  },
  {
    id: "coffee-10",
    name: "Raf",
    secondaryName: "Раф",
    description: "Espresso with steamed milk and a light layer of foam",
    price: 2.50,
    imageUrl: "/drinks/cold-brew.jpg",
    availableOptions: [
      // defaultOptions.coffeeSize,
      defaultOptions.cupType,
      defaultOptions.milkType,
    ],
  },
  {
    id: "coffee-11",
    name: "Moka",
    secondaryName: "Мока",
    description: "Espresso with steamed milk and a light layer of foam",
    price: 2.50,
    imageUrl: "/drinks/cold-brew.jpg",
    availableOptions: [
      // defaultOptions.coffeeSize,
      defaultOptions.cupType,
      defaultOptions.milkType,
    ],
  },
  {
    id: "coffee-12",
    name: "Dvigubas kapučinas",
    secondaryName: "Двойной капучино",
    description: "Espresso with steamed milk and a light layer of foam",
    price: 3.00,
    imageUrl: "/drinks/cold-brew.jpg",
    availableOptions: [
      // defaultOptions.coffeeSize,
      defaultOptions.cupType,
      defaultOptions.milkType,
    ],
  }
];
