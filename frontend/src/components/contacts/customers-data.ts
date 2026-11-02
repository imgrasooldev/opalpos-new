/**
 * Demo content for the Customers screen.
 *
 * STATIC FOR NOW, like users-data.ts. Once the contacts endpoint exists, a hook
 * (`useCustomers(filters)`) replaces this array and the filters become query
 * params.
 */

import { DEMO_USERS } from "@/components/users/users-data";

export type DemoCustomer = {
  id: number;
  contactId: string;
  businessName: string | null;
  name: string;
  email: string | null;
  taxNumber: string | null;
  creditLimit: number | null;
  /** e.g. "30 days"; null when not set. */
  payTerm: string | null;
  openingBalance: number;
  advanceBalance: number;
  /** ISO date. */
  addedOn: string;
  opalPoints: number;
  group: string | null;
  address: string | null;
  mobile: string | null;
  /** ISO date of birth. */
  dob: string | null;
  /** Negative means the customer is owed money (overpaid). */
  saleDue: number;
  sellReturnDue: number;
  /** ISO date of the last sale, null if they never bought anything. */
  lastSaleOn: string | null;
  /** User id this customer is assigned to. */
  assignedTo: number | null;
  active: boolean;
  customFields: (string | null)[];
};

/** The business printed on statements (ledger "From" block). */
export const DEMO_BUSINESS = {
  name: "Opal Pay",
  lines: ["Fort Worth, Texas", "United States, 76109"],
};

/** "Today" for the demo data, so the "has no sell from" filter is stable. */
export const DEMO_TODAY = "2026-11-02";

export const CUSTOMER_GROUPS = ["Retail", "Wholesale", "VIP"];

export const ASSIGNABLE_USERS = DEMO_USERS.map((u) => ({ id: u.id, name: u.name }));

const EMPTY_FIELDS = [null, null, null, null, null];

function customer(
  c: Partial<DemoCustomer> & Pick<DemoCustomer, "id" | "contactId" | "name" | "addedOn">,
): DemoCustomer {
  return {
    businessName: null,
    email: null,
    taxNumber: null,
    creditLimit: null,
    payTerm: null,
    openingBalance: 0,
    advanceBalance: 0,
    opalPoints: 0,
    group: null,
    address: null,
    mobile: null,
    dob: null,
    saleDue: 0,
    sellReturnDue: 0,
    lastSaleOn: null,
    assignedTo: null,
    active: true,
    customFields: EMPTY_FIELDS,
    ...c,
  };
}

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  customer({
    id: 1,
    contactId: "CO0001",
    name: "Walk-In Customer",
    addedOn: "2022-11-21",
    saleDue: -5.83,
    sellReturnDue: 181.65,
    lastSaleOn: "2026-11-01",
  }),
  customer({
    id: 2,
    contactId: "0013",
    name: "Ahmed Raza",
    mobile: "+1 555 010 1301",
    addedOn: "2026-10-30",
    lastSaleOn: "2026-10-31",
    group: "Retail",
    assignedTo: 4,
  }),
  customer({
    id: 3,
    contactId: "0012",
    name: "Kamran Khan",
    mobile: "+1 555 010 1202",
    addedOn: "2026-03-12",
    group: "Wholesale",
    businessName: "Khan Traders",
    address: "45 Mall Road, Lahore",
    email: "orders@khantraders.example",
    creditLimit: 5000,
    payTerm: "30 days",
    saleDue: 420,
    lastSaleOn: "2026-08-14",
    assignedTo: 3,
  }),
  customer({
    id: 4,
    contactId: "0011",
    name: "Ijlal Hussain",
    mobile: "+1 555 010 1103",
    addedOn: "2026-10-30",
  }),
  customer({
    id: 5,
    contactId: "0010",
    name: "Moeez Ali",
    mobile: "+1 555 010 1004",
    addedOn: "2026-10-30",
    advanceBalance: 50,
    lastSaleOn: "2026-10-30",
  }),
  customer({
    id: 6,
    contactId: "0009",
    name: "Ali Hamza",
    mobile: "+1 555 010 0905",
    addedOn: "2025-12-02",
    lastSaleOn: "2026-05-02",
    group: "Retail",
  }),
  customer({
    id: 7,
    contactId: "0008",
    name: "Ali Shah",
    mobile: "+1 555 010 0806",
    addedOn: "2026-10-29",
    openingBalance: 120,
  }),
  customer({
    id: 8,
    contactId: "0007",
    name: "Zia Ullah",
    mobile: "+1 555 010 0707",
    addedOn: "2025-06-20",
    lastSaleOn: "2025-09-12",
    active: false,
  }),
  customer({
    id: 9,
    contactId: "0006",
    name: "Hyder Khan",
    mobile: "+1 555 010 0608",
    addedOn: "2026-09-05",
    sellReturnDue: 35,
    lastSaleOn: "2026-10-20",
    address: "3 Station Road, Arlington",
    assignedTo: 4,
  }),
  customer({
    id: 10,
    contactId: "0005",
    name: "JG Stores",
    businessName: "JG Stores",
    mobile: "+1 555 010 0509",
    addedOn: "2026-05-18",
    group: "Wholesale",
    creditLimit: 2500,
    payTerm: "15 days",
    lastSaleOn: "2026-09-28",
  }),
  customer({
    id: 11,
    contactId: "0004",
    name: "Maria Lopez",
    email: "maria@shop.example",
    mobile: "+1 555 010 0410",
    addedOn: "2026-10-28",
  }),
  customer({
    id: 12,
    contactId: "0003",
    name: "Sheila Brown",
    email: "sheila@shop.example",
    mobile: "+1 555 010 0311",
    addedOn: "2026-10-26",
    opalPoints: 450,
    group: "VIP",
    dob: "1990-04-12",
    address: "8 Elm Avenue, Fort Worth",
    lastSaleOn: "2026-10-26",
    assignedTo: 3,
  }),
  customer({
    id: 13,
    contactId: "0002",
    name: "John Doe",
    email: "john@shop.example",
    mobile: "+1 555 010 0212",
    addedOn: "2026-10-19",
    opalPoints: 45,
    saleDue: -26.25,
    lastSaleOn: "2026-10-19",
    address: "12 Market Street, Dallas",
    dob: "1985-11-30",
  }),
];
