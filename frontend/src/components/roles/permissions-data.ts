/**
 * Permission catalog for the role form — same groups, order and labels as the
 * old Opal POS "Add Role" screen.
 *
 * A group is made of blocks: a "check" block is independent checkboxes, a
 * "radio" block is pick-one (e.g. view all vs view own). Keys are derived from
 * the labels, e.g. "sell.view-own-sell-only", so the backend can map them to
 * its permission names later.
 */

export type PermissionOption = { key: string; label: string };

export type PermissionBlock =
  | { kind: "check"; items: PermissionOption[] }
  | { kind: "radio"; id: string; items: PermissionOption[] };

export type PermissionGroup = {
  key: string;
  label: string;
  /** Short help shown under the group name (the old screen's info icons). */
  hint?: string;
  /** Groups without "Select all" in the old screen keep it hidden. */
  selectAll: boolean;
  blocks: PermissionBlock[];
};

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type BlockSpec = { kind: "check" | "radio"; labels: string[] };
const check = (...labels: string[]): BlockSpec => ({ kind: "check", labels });
const radio = (...labels: string[]): BlockSpec => ({ kind: "radio", labels });

function group(
  key: string,
  label: string,
  specs: BlockSpec[],
  options: { hint?: string; selectAll?: boolean } = {},
): PermissionGroup {
  return {
    key,
    label,
    hint: options.hint,
    selectAll: options.selectAll ?? true,
    blocks: specs.map((spec, index) => {
      const items = spec.labels.map((l) => ({ key: `${key}.${slug(l)}`, label: l }));
      return spec.kind === "check"
        ? { kind: "check", items }
        : { kind: "radio", id: `${key}.scope-${index}`, items };
    }),
  };
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  group("others", "Others", [
    check("View export to buttons (csv/excel/print/pdf) on tables"),
  ]),
  group("user", "User", [check("View user", "Add user", "Edit user", "Delete user")]),
  group("roles", "Roles", [check("View role", "Add role", "Edit role", "Delete role")]),
  group("supplier", "Supplier", [
    radio("View all supplier", "View own supplier"),
    check("Add supplier", "Edit supplier", "Delete supplier"),
  ]),
  group(
    "customer",
    "Customer",
    [
      radio("View all customer", "View own customer"),
      radio(
        "View customers with no sell from one month only",
        "View customers with no sell from three months only",
        "View customers with no sell from six months only",
        "View customers with no sell from one year only",
        "View customers irrespective of their sell",
      ),
      check("Add customer", "Edit customer", "Delete customer"),
    ],
    { hint: "Which customers this role can see, and for how long since their last sale." },
  ),
  group("product", "Product", [
    check(
      "View product",
      "Add product",
      "Edit product",
      "Delete product",
      "Update & Edit Quantity",
      "View Purchase Price",
    ),
  ]),
  group("purchase", "Purchase & Stock Adjustment", [
    radio("View all Purchase & Stock Adjustment", "View own Purchase & Stock Adjustment"),
    check(
      "Add purchase & Stock Adjustment",
      "Edit purchase & Stock Adjustment",
      "Delete purchase & Stock Adjustment",
      "Add purchase payment",
      "Edit purchase payment",
      "Delete purchase payment",
      "Update Status",
    ),
  ]),
  group("pos", "POS", [
    check(
      "View POS sell",
      "Add POS sell",
      "Edit POS sell",
      "Delete POS sell",
      "Edit product price from POS screen",
      "Edit product discount from POS screen",
      "Print Invoice",
    ),
  ]),
  group("invoice-discount", "Invoice Discount", [check("Allow Individual Invoice Discount")]),
  group(
    "sell",
    "Sell",
    [
      radio("View all sell", "View own sell only"),
      check(
        "View paid sells only",
        "View due sells only",
        "View partially paid sells only",
        "View overdue sells only",
        "Add Sell",
        "Update Sell",
        "Delete Sell",
        "Commission agent can view their own sell",
        "Add sell payment",
        "Edit sell payment",
        "Delete sell payment",
        "Edit product price from sales screen",
        "Edit product discount from Sale screen",
        "Add/Edit/Delete Discount",
        "Access all sell return",
        "Access own sell return",
        "Add edit invoice number",
      ),
    ],
    { hint: "\"View own\" limits the sales list to sales this user made." },
  ),
  group("draft", "Draft", [
    radio("View all drafts", "View own drafts"),
    check("Edit draft", "Delete draft"),
  ]),
  group("quotation", "Quotation", [
    radio("View all quotations", "View own quotations"),
    check("Edit quotation", "Delete quotation"),
  ]),
  group("shipments", "Shipments", [
    radio("Access all shipments", "Access own shipments"),
    check("Access pending shipments only", "Commission agent can access their own shipments"),
  ]),
  group("cash-register", "Cash Register", [check("View cash register", "Close cash register")]),
  group("brand", "Brand", [check("View brand", "Add brand", "Edit brand", "Delete brand")]),
  group("tax-rate", "Tax rate", [
    check("View tax rate", "Add tax rate", "Edit tax rate", "Delete tax rate"),
  ]),
  group("unit", "Unit", [check("View unit", "Add unit", "Edit unit", "Delete unit")]),
  group("category", "Category", [
    check("View category", "Add category", "Edit category", "Delete category"),
  ]),
  group("report", "Report", [
    check(
      "View purchase & sell report",
      "View Tax report",
      "View Supplier & Customer report",
      "View expense report",
      "View profit/loss report",
      "View stock report, stock adjustment report & stock expiry report",
      "View trending product report",
      "View register report",
      "View sales representative report",
      "View product stock value",
    ),
  ]),
  group("settings", "Settings", [
    check(
      "Access business settings",
      "Access barcode settings",
      "Access invoice settings",
      "Access printers",
    ),
  ]),
  group("expense", "Expense", [
    radio("Access all expenses", "View own expense only"),
    check("Add Expense", "Edit Expense", "Delete Expense"),
  ]),
  group("home", "Home", [check("View Home data")], {
    hint: "Shows the dashboard figures on the home screen.",
    selectAll: false,
  }),
  group(
    "account",
    "Account",
    [check("Access Accounts", "Edit account transaction", "Delete account transaction")],
    { selectAll: false },
  ),
  group("selling-price", "Access selling price groups", [check("Default Selling Price")], {
    selectAll: false,
  }),
  group(
    "small-screens",
    "Show Reports on Small Screens",
    [check("Show summary report", "Show register report")],
    { selectAll: false },
  ),
];

/** Checked on a brand-new role, as in the old screen. */
export const DEFAULT_PERMISSIONS = [
  "home.view-home-data",
  "selling-price.default-selling-price",
];

/** Every key in the catalog — used to sanity-check the demo role presets. */
export const ALL_PERMISSION_KEYS = new Set(
  PERMISSION_GROUPS.flatMap((g) => g.blocks.flatMap((b) => b.items.map((i) => i.key))),
);
