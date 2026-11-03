/**
 * Demo content for the Products screen.
 *
 * STATIC FOR NOW, like customers-data.ts. The product hooks in
 * `hooks/use-products.ts` talk to the real API; once its fields cover what
 * this screen shows, they replace this array.
 */

export type ProductVariation = {
  name: string;
  sku: string;
  stock: number;
  sold: number;
  /** Own prices; when missing the product's prices apply. */
  purchasePrice?: number;
  sellingPrice?: number;
  ageVerification?: boolean;
};

/** Where a product sits in one location. */
export type Shelf = { rack: string; row: string; position: string };

export type MovementType =
  | "Opening / Add stock"
  | "Purchase"
  | "Purchase return"
  | "Sell"
  | "Sell return"
  | "Stock adjustment"
  | "Stock transfer (out)"
  | "Stock transfer (in)";

/** One change to a product's (or variation's) stock — see stock-history.ts. */
export type StockMovement = {
  /** SKU of the variation, or of the product when it has no variations. */
  sku: string;
  type: MovementType;
  /** Positive adds stock, negative removes it. */
  qty: number;
  location: string | null;
  /** ISO date-time. */
  date: string;
  ref: string | null;
  party: string | null;
};

export type DemoProduct = {
  id: number;
  name: string;
  sku: string;
  type: "Single" | "Variable" | "Combo";
  category: string | null;
  /** A sub category of `category`, by name. */
  subCategory?: string | null;
  brand: string | null;
  unit: string;
  tax: string | null;
  locations: string[];
  purchasePrice: number;
  sellingPrice: number;
  /** For variable products: the sum of the variations' stock. */
  stock: number;
  sold: number;
  transferred: number;
  adjusted: number;
  active: boolean;
  notForSelling: boolean;
  variations: ProductVariation[];
  // the rest of the add/edit form, so Edit shows what was saved
  barcodeType?: string;
  alertQuantity?: number | null;
  manageStock?: boolean;
  ageVerification?: boolean;
  taxType?: "Inclusive" | "Exclusive";
  /** Rack / row / position per location name. */
  shelves?: Record<string, Shelf>;
  /** Stock changes made in this app (add stock, opening stock, edit). */
  movements?: StockMovement[];
  /** Selling price per price group id, then per SKU (variation or product). */
  groupPrices?: Record<number, Record<string, number>>;
};

export const PRODUCT_TYPES = ["Single", "Variable", "Combo"] as const;
export const TAXES = ["Sales tax 8.25%"];
export const PRODUCT_LOCATIONS = ["GR Store", "City Outlet"];
/** Business location codes, shown next to the name as in the old screens. */
export const LOCATION_CODES: Record<string, string> = {
  "GR Store": "BL0001",
  "City Outlet": "BL0002",
};

function product(
  p: Partial<DemoProduct> &
    Pick<DemoProduct, "id" | "name" | "sku" | "purchasePrice" | "sellingPrice">,
): DemoProduct {
  const variations = p.variations ?? [];
  return {
    type: variations.length ? "Variable" : "Single",
    category: null,
    brand: null,
    unit: "Pcs",
    tax: null,
    locations: ["GR Store"],
    stock: variations.reduce((t, v) => t + v.stock, 0),
    sold: variations.reduce((t, v) => t + v.sold, 0),
    transferred: 0,
    adjusted: 0,
    active: true,
    notForSelling: false,
    ...p,
    variations,
  };
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  product({
    id: 1,
    name: "Black Berry",
    sku: "548485178656",
    category: "Vapes",
    brand: "Cloud Co",
    tax: "Sales tax 8.25%",
    purchasePrice: 8.5,
    sellingPrice: 15,
    alertQuantity: 2,
    locations: ["GR Store", "City Outlet"],
    variations: [
      { name: "Red", sku: "548485178656-1", stock: 40, sold: 120 },
      { name: "Blue", sku: "548485178656-2", stock: 25, sold: 64 },
    ],
  }),
  product({
    id: 2,
    name: "Test",
    sku: "0001",
    locations: [],
    purchasePrice: 10,
    sellingPrice: 150,
    stock: -51,
    sold: 51,
  }),
  product({
    id: 3,
    name: "Glass Water Pipe 12\"",
    sku: "GL-1201",
    category: "Glass",
    brand: "Pure Glass",
    tax: "Sales tax 8.25%",
    locations: ["GR Store", "City Outlet"],
    purchasePrice: 22,
    sellingPrice: 45,
    stock: 12,
    sold: 30,
    transferred: 4,
  }),
  product({
    id: 4,
    name: "Rolling Papers King Size",
    sku: "AC-2001",
    category: "Accessories",
    unit: "Pack",
    purchasePrice: 0.6,
    sellingPrice: 1.5,
    stock: 300,
    sold: 820,
    adjusted: 6,
  }),
  product({
    id: 5,
    name: "Butane Refill 300ml",
    sku: "AC-2010",
    category: "Accessories",
    brand: "Zippo",
    purchasePrice: 2.2,
    sellingPrice: 4.99,
    stock: 0,
    sold: 145,
  }),
  product({
    id: 6,
    name: "Hookah Charcoal 1kg",
    sku: "HK-3001",
    category: "Hookah",
    brand: "Starbuzz",
    unit: "Box",
    locations: ["City Outlet"],
    purchasePrice: 3.5,
    sellingPrice: 7.99,
    stock: 64,
    sold: 210,
  }),
  product({
    id: 7,
    name: "Grinder 4-piece",
    sku: "AC-2020",
    category: "Accessories",
    purchasePrice: 4,
    sellingPrice: 12,
    variations: [
      { name: "Black", sku: "AC-2020-B", stock: 18, sold: 22 },
      { name: "Silver", sku: "AC-2020-S", stock: 9, sold: 15 },
    ],
  }),
  product({
    id: 8,
    name: "Display Stand",
    sku: "SH-9001",
    purchasePrice: 30,
    sellingPrice: 0,
    stock: 2,
    notForSelling: true,
  }),
  product({
    id: 9,
    name: "Mango Flavor Pod",
    sku: "VP-1102",
    category: "Vapes",
    brand: "Cloud Co",
    purchasePrice: 3,
    sellingPrice: 6.5,
    stock: 14,
    sold: 96,
    active: false,
  }),
  product({
    id: 10,
    name: "Grinder 2-piece",
    sku: "AC-2018",
    category: "Accessories",
    purchasePrice: 2,
    sellingPrice: 6,
    stock: 0,
    sold: 40,
    active: false,
  }),
];
