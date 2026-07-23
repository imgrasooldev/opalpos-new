/**
 * Product types — backend ke `app/schemas/product.py` ka mirror.
 *
 * REFERENCE SLICE: naye resource ke liye yehi shakal follow karo.
 * Backend schema badle to ye file bhi update karo, warna types jhoot bolenge
 * (TypeScript runtime par check nahi karta).
 *
 * NOTE: backend `Decimal` ko JSON mein **string** bhejta hai (paise mein
 * floating-point error se bachne ke liye). Isliye prices yahan `string` hain —
 * `number` mat karo. Hisaab karna ho to Number() se convert karo, ya behtar,
 * hisaab backend par karwao.
 */

export type ProductType = "single" | "variable" | "combo";

export type Variation = {
  id: number;
  name: string;
  sub_sku: string;
  default_purchase_price: string;
  default_sell_price: string;
  profit_percent: string;
};

/** Nested lookup — backend relationship se aata hai (unit/category/brand). */
export type LookupBrief = {
  id: number;
  name: string;
};

export type Product = {
  id: number;
  name: string;
  type: ProductType;
  sku: string;
  unit_id: number;
  category_id: number | null;
  brand_id: number | null;
  enable_stock: boolean;
  alert_quantity: string | null;
  description: string | null;
  is_inactive: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;

  // relationships — backend `lazy="selectin"` se bina extra query ke bhejta hai
  variations: Variation[];
  unit: LookupBrief | null;
  category: LookupBrief | null;
  brand: LookupBrief | null;
};

/** POST /products ka body — backend `ProductCreate`. */
export type ProductCreateInput = {
  name: string;
  type?: ProductType;
  unit_id: number;
  category_id?: number | null;
  brand_id?: number | null;
  enable_stock?: boolean;
  alert_quantity?: string | null;
  description?: string | null;
  is_inactive?: boolean;
  /** khali chhodo to backend auto-generate karega */
  sku?: string | null;
  variations: Array<{
    name?: string;
    sub_sku?: string | null;
    default_purchase_price?: string;
    default_sell_price?: string;
    profit_percent?: string;
  }>;
};

/** PATCH /products/{id} — sab optional. */
export type ProductUpdateInput = Partial<
  Omit<ProductCreateInput, "variations" | "sku">
>;

/** GET /products ke query params. */
export type ProductFilters = {
  q?: string;
  category_id?: number;
  brand_id?: number;
  only_active?: boolean;
  page?: number;
  size?: number;
};
