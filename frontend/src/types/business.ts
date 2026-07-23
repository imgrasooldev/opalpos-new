/** Business types — backend `app/schemas/business.py` ka mirror. */

export type Location = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type Business = {
  id: number;
  name: string;
  currency_code: string;
  sku_prefix: string | null;
  is_active: boolean;
  created_at: string;
  /** relationship — backend nested bhejta hai */
  locations: Location[];
};

export type BusinessUpdateInput = {
  name?: string;
  currency_code?: string;
  sku_prefix?: string | null;
};

export type LocationCreateInput = {
  name: string;
  is_active?: boolean;
};

export type LocationUpdateInput = Partial<LocationCreateInput>;
