/**
 * Demo content for the Roles screens.
 *
 * STATIC FOR NOW, like users-data.ts. Once the roles endpoint exists, a hook
 * (`useRoles()`) replaces this array; the table works from props.
 */

import { DEFAULT_PERMISSIONS } from "@/components/roles/permissions-data";
import { DEMO_USERS } from "@/components/users/users-data";

export type DemoRole = {
  id: number;
  name: string;
  description: string;
  /** Built-in role — can't be edited or deleted (Admin). */
  system: boolean;
  /** How many users have this role. */
  users: number;
  /** Permission keys from `PERMISSION_GROUPS` (checkboxes and chosen radio options). */
  permissions: string[];
};

const ROLES: Omit<DemoRole, "users">[] = [
  {
    id: 1,
    name: "Admin",
    description: "Full access to every screen and setting.",
    system: true,
    // admins bypass permission checks entirely
    permissions: [],
  },
  {
    id: 2,
    name: "Cashier",
    description: "Runs the POS: sales, returns and drafts.",
    system: false,
    permissions: [
      ...DEFAULT_PERMISSIONS,
      "customer.view-all-customer",
      "customer.add-customer",
      "pos.view-pos-sell",
      "pos.add-pos-sell",
      "pos.print-invoice",
      "sell.view-own-sell-only",
      "sell.add-sell",
      "sell.add-sell-payment",
      "draft.view-own-drafts",
      "cash-register.view-cash-register",
      "cash-register.close-cash-register",
    ],
  },
  {
    id: 3,
    name: "Manager",
    description: "Sales, inventory and reports for assigned locations.",
    system: false,
    permissions: [
      ...DEFAULT_PERMISSIONS,
      "user.view-user",
      "customer.view-all-customer",
      "customer.add-customer",
      "customer.edit-customer",
      "product.view-product",
      "product.add-product",
      "product.edit-product",
      "product.update-and-edit-quantity",
      "purchase.view-all-purchase-and-stock-adjustment",
      "purchase.add-purchase-and-stock-adjustment",
      "sell.view-all-sell",
      "sell.add-sell",
      "sell.update-sell",
      "report.view-purchase-and-sell-report",
      "report.view-stock-report-stock-adjustment-report-and-stock-expiry-report",
      "report.view-trending-product-report",
    ],
  },
  {
    id: 4,
    name: "Store Manager",
    description: "Day-to-day store operations, stock and staff.",
    system: false,
    permissions: [
      ...DEFAULT_PERMISSIONS,
      "user.view-user",
      "product.view-product",
      "product.update-and-edit-quantity",
      "purchase.view-own-purchase-and-stock-adjustment",
      "purchase.add-purchase-and-stock-adjustment",
      "sell.view-all-sell",
      "cash-register.view-cash-register",
      "cash-register.close-cash-register",
      "expense.view-own-expense-only",
      "expense.add-expense",
    ],
  },
];

export const DEMO_ROLES: DemoRole[] = ROLES.map((role) => ({
  ...role,
  users: DEMO_USERS.filter((u) => u.role === role.name).length,
}));
