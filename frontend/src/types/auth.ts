/** Auth types — backend `app/schemas/auth.py` ka mirror. */

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  business_name: string;
  email: string;
  password: string;
  full_name?: string | null;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type RoleBrief = {
  id: number;
  name: string;
  is_admin: boolean;
};

export type BusinessBrief = {
  id: number;
  name: string;
};

/** `GET /auth/me` — user + uske rishtay. */
export type Me = {
  id: number;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  business: BusinessBrief | null;
  role: RoleBrief | null;
  /** Flat list, e.g. ["product.view", "product.create"] */
  permissions: string[];
};
