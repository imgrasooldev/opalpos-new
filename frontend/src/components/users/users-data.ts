/**
 * Demo content for the Users screens.
 *
 * STATIC FOR NOW, like dashboard-data.ts. Once the users endpoint exists, a hook
 * (`useUsers()`) replaces this array; the table works from props, so its markup
 * stays the same.
 */

export type DemoUser = {
  id: number;
  /** Cashiers have no login username — they open the POS with a PIN. */
  username: string | null;
  pin: string | null;
  name: string;
  role: "Admin" | "Store Manager" | "Manager" | "Cashier";
  email: string;
  /** Sales commission, in percent. */
  commission: number;
  /** Which admin/store the user belongs to — `null` for admins. */
  assignedAdmin: string | null;
  /** For the form: locations the user works at (ids from `LOCATIONS`). */
  locationIds: string[];
  /** For the form: admins a PIN user is assigned to (ids from `ADMINS`). */
  adminIds: number[];
};

export const DEMO_USERS: DemoUser[] = [
  {
    id: 1,
    username: "admin",
    pin: null,
    name: "Adnan Ahmed",
    role: "Admin",
    email: "adnan@grstore.example",
    commission: 10,
    assignedAdmin: null,
    locationIds: ["BL0001", "BL0002"],
    adminIds: [],
  },
  {
    id: 2,
    username: null,
    pin: "0000",
    name: "Mr Cashier",
    role: "Cashier",
    email: "cashier@grstore.example",
    commission: 0,
    assignedAdmin: "GR Store",
    locationIds: ["BL0001"],
    adminIds: [1],
  },
  {
    id: 3,
    username: "sara.manager",
    pin: null,
    name: "Sara Khan",
    role: "Manager",
    email: "sara@grstore.example",
    commission: 5,
    assignedAdmin: "GR Store",
    locationIds: ["BL0001"],
    adminIds: [1],
  },
  {
    id: 4,
    username: null,
    pin: "1122",
    name: "Bilal Raza",
    role: "Cashier",
    email: "bilal@grstore.example",
    commission: 2.5,
    assignedAdmin: "GR Store",
    locationIds: ["BL0001"],
    adminIds: [1, 3],
  },
  {
    id: 5,
    username: null,
    pin: "4581",
    name: "Hina Malik",
    role: "Cashier",
    email: "hina@grstore.example",
    commission: 2.5,
    assignedAdmin: "City Outlet",
    locationIds: ["BL0002"],
    adminIds: [1, 6],
  },
  {
    id: 6,
    username: "usman.ops",
    pin: null,
    name: "Usman Tariq",
    role: "Manager",
    email: "usman@grstore.example",
    commission: 4,
    assignedAdmin: "City Outlet",
    locationIds: ["BL0002"],
    adminIds: [1],
  },
];

/** Dropdown and checkbox options for the user form. */
export const ROLES = ["Admin", "Store Manager", "Manager", "Cashier"] as const;
export type RoleName = (typeof ROLES)[number];

export const LOCATIONS = [
  { id: "BL0001", name: "GR Store" },
  { id: "BL0002", name: "City Outlet" },
];

/** Admins a cashier or manager can be assigned to. */
export const ADMINS = DEMO_USERS.filter((u) => u.role !== "Cashier").map(
  (u) => ({ id: u.id, name: u.name }),
);

/** Badge color per role, shared by the users table and the user view. */
export const ROLE_TONE: Record<DemoUser["role"], "blue" | "amber" | "green"> = {
  Admin: "blue",
  "Store Manager": "amber",
  Manager: "amber",
  Cashier: "green",
};
