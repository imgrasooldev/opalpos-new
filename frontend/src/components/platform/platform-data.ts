"use client";

/**
 * Platform admin (SaaS owner) data, following docs "Opal POS SaaS Flow":
 *
 *   Feature catalog  every sellable feature with a monthly and yearly price.
 *                    Core POS features are always included and cost nothing.
 *   Plans            ready bundles of add-on features with usage limits
 *                    (locations, users, products, invoices) and trial days.
 *   Subscription     what one business has bought: a plan or single
 *                    features, plus extra locations / users, billed monthly
 *                    or yearly, renewing automatically.
 *   Invoices         one per billing period (plus manual ones); unpaid ones
 *                    get reminders, then a grace period, then the business
 *                    is suspended.
 *
 * Demo dates are relative to today, so there is always a business on trial,
 * one past due, one suspended and one renewal waiting to run.
 *
 * STAND-IN FOR THE API: replaced by the platform admin endpoints later.
 */

import { createDemoStore } from "@/components/inventory/demo-store";

// ---------- dates ----------

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Today as "YYYY-MM-DD", in local time. */
export const today = () => ymd(new Date());

/** "YYYY-MM-DD" for `from` plus `offset` days. */
export function dayFrom(offset: number, from = today()) {
  const d = new Date(`${from}T00:00`);
  d.setDate(d.getDate() + offset);
  return ymd(d);
}

/** Whole days from `a` to `b` (negative when `b` is earlier). */
export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00`).getTime() - new Date(`${a}T00:00`).getTime()) / 86400000);

/** "1 day", "5 days". */
export const days = (n: number) => `${n} day${Math.abs(n) === 1 ? "" : "s"}`;

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(`${d.slice(0, 10)}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";

export const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// ---------- billing cycles ----------

export const CYCLES = ["Monthly", "Yearly"] as const;
export type Cycle = (typeof CYCLES)[number];

/** Start of the period after the one starting on `start`. */
export function nextPeriodStart(start: string, cycle: Cycle) {
  const d = new Date(`${start}T00:00`);
  if (cycle === "Monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return ymd(d);
}

/** Last day of the period starting on `start`. */
export const periodEndFor = (start: string, cycle: Cycle) => dayFrom(-1, nextPeriodStart(start, cycle));

const monthsBefore = (date: string, months: number) => {
  const d = new Date(`${date}T00:00`);
  d.setMonth(d.getMonth() - months);
  return ymd(d);
};

// ---------- feature catalog ----------

export type Feature = {
  key: string;
  name: string;
  description: string;
  /** Core POS: always included, never sold on its own. */
  core: boolean;
  monthly: number;
  yearly: number;
  /** Sold per extra location / user instead of switched on. */
  unit: "location" | "user" | null;
  /** Inactive add-ons can't be added to new subscriptions. */
  active: boolean;
};

export const DEMO_FEATURES: Feature[] = [
  { key: "core_setup", name: "Settings, locations and tax", description: "Business settings, business locations, tax rates, invoice and barcode settings.", core: true, monthly: 0, yearly: 0, unit: null, active: true },
  { key: "core_users", name: "Users and roles", description: "Staff logins, roles and permissions.", core: true, monthly: 0, yearly: 0, unit: null, active: true },
  { key: "core_customers", name: "Customers", description: "Customer contacts, ledger and payments.", core: true, monthly: 0, yearly: 0, unit: null, active: true },
  { key: "core_inventory", name: "Products and inventory", description: "Products, variations, units, categories, brands, labels and stock history.", core: true, monthly: 0, yearly: 0, unit: null, active: true },
  { key: "core_pos", name: "POS sales, returns and cash register", description: "Selling on the POS screen, sell returns, shipments, discounts and the cash register.", core: true, monthly: 0, yearly: 0, unit: null, active: true },
  { key: "core_reports", name: "Core reports", description: "Register, Summary and Sales tax reports, plus the sales reports.", core: true, monthly: 0, yearly: 0, unit: null, active: true },
  { key: "purchases", name: "Purchases", description: "Purchase orders, purchases, purchase returns and the purchase reports.", core: false, monthly: 15, yearly: 150, unit: null, active: true },
  { key: "add_sale", name: "Add Sale", description: "The web sales screen, drafts, quotations and sales import.", core: false, monthly: 10, yearly: 100, unit: null, active: true },
  { key: "stock_transfers", name: "Stock Transfers", description: "Move stock between business locations.", core: false, monthly: 10, yearly: 100, unit: null, active: true },
  { key: "stock_adjustment", name: "Stock Adjustment", description: "Write off damaged or lost stock, with its own report.", core: false, monthly: 5, yearly: 50, unit: null, active: true },
  { key: "expenses", name: "Expenses", description: "Expenses, expense categories and the expense report.", core: false, monthly: 5, yearly: 50, unit: null, active: true },
  { key: "opal_points", name: "Opal Points", description: "Customer reward points and the Opal Points report.", core: false, monthly: 10, yearly: 100, unit: null, active: true },
  { key: "tips", name: "Tips", description: "Tip reports and tip history, and marking tips as paid.", core: false, monthly: 5, yearly: 50, unit: null, active: true },
  { key: "cashier_commission", name: "Cashier Commission", description: "Commission per cashier and paying it out.", core: false, monthly: 5, yearly: 50, unit: null, active: true },
  { key: "extra_location", name: "Extra location", description: "One more business location on top of the plan's limit.", core: false, monthly: 15, yearly: 150, unit: "location", active: true },
  { key: "extra_user", name: "Extra user", description: "One more staff login on top of the plan's limit.", core: false, monthly: 3, yearly: 30, unit: "user", active: true },
];

const features = createDemoStore<Feature>("opalpay.platform-features", DEMO_FEATURES);
export const useFeatures = features.use;
export const updateFeatures = features.update;

export const featurePrice = (f: Pick<Feature, "monthly" | "yearly">, cycle: Cycle) => (cycle === "Monthly" ? f.monthly : f.yearly);

// ---------- plans ----------

export type Plan = {
  id: number;
  name: string;
  description: string;
  monthly: number;
  yearly: number;
  trialDays: number;
  /** Usage limits; 0 means unlimited. */
  locations: number;
  users: number;
  products: number;
  /** Invoices per month. */
  invoices: number;
  /** Add-on feature keys bundled in (core features are always there). */
  features: string[];
  /** Hidden from sign-up; only the platform team can give it. */
  isPrivate: boolean;
  highlighted: boolean;
  sortOrder: number;
  active: boolean;
};

const ALL_ADDONS = ["purchases", "add_sale", "stock_transfers", "stock_adjustment", "expenses", "opal_points", "tips", "cashier_commission"];

export const DEMO_PLANS: Plan[] = [
  { id: 1, name: "Basic", description: "Core POS for a single shop, with expenses.", monthly: 29, yearly: 290, trialDays: 14, locations: 1, users: 3, products: 1000, invoices: 3000, features: ["expenses"], isPrivate: false, highlighted: false, sortOrder: 1, active: true },
  { id: 2, name: "Standard", description: "For busy shops: purchases, web sales and rewards.", monthly: 59, yearly: 590, trialDays: 14, locations: 2, users: 8, products: 5000, invoices: 0, features: ["purchases", "add_sale", "stock_adjustment", "expenses", "opal_points"], isPrivate: false, highlighted: true, sortOrder: 2, active: true },
  { id: 3, name: "Pro", description: "Everything Opal POS does, for multi-location shops.", monthly: 99, yearly: 990, trialDays: 14, locations: 5, users: 25, products: 0, invoices: 0, features: ALL_ADDONS, isPrivate: false, highlighted: false, sortOrder: 3, active: true },
  { id: 4, name: "Enterprise", description: "Agreed with the customer; not on the sign-up page.", monthly: 249, yearly: 2490, trialDays: 0, locations: 0, users: 0, products: 0, invoices: 0, features: ALL_ADDONS, isPrivate: true, highlighted: false, sortOrder: 4, active: true },
];

const plans = createDemoStore<Plan>("opalpay.platform-plans", DEMO_PLANS);
export const usePlans = plans.use;
export const updatePlans = plans.update;

export const planPrice = (p: Pick<Plan, "monthly" | "yearly">, cycle: Cycle) => (cycle === "Monthly" ? p.monthly : p.yearly);
export const limitLabel = (n: number) => (n === 0 ? "Unlimited" : n.toLocaleString("en-US"));

/** Limits when a business buys single features without a plan. */
export const BASE_LIMITS = { locations: 1, users: 2, products: 1000, invoices: 0 };

// ---------- businesses ----------

export type Business = {
  id: number;
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerMobile: string;
  username: string;
  country: string;
  city: string;
  currency: string;
  timezone: string;
  /** First business location, created with the business. */
  locationName: string;
  address: string;
  /** Sign-up date, "YYYY-MM-DD". */
  createdAt: string;
  /** Blocked by hand by the platform team. */
  suspended: boolean;
  suspendReason: string;
  /** Usage, as reported by the business. */
  locations: number;
  users: number;
  products: number;
  invoicesThisMonth: number;
  lastActive: string;
  notes: string;
};

const biz = (b: Omit<Business, "currency" | "timezone" | "notes" | "country" | "suspended" | "suspendReason" | "address"> & Partial<Business>): Business => ({
  currency: "USD",
  timezone: "America/Chicago",
  country: "United States",
  notes: "",
  suspended: false,
  suspendReason: "",
  address: "",
  ...b,
});

export const DEMO_BUSINESSES: Business[] = [
  biz({ id: 1, name: "Glass Galaxy", ownerName: "Talha Saleem", ownerEmail: "talha@glassgalaxy.example", ownerMobile: "+1 555 300 1001", username: "glassgalaxy", city: "Fort Worth", locationName: "GR Store", address: "4410 Camp Bowie Blvd, Fort Worth, TX", createdAt: dayFrom(-324), locations: 2, users: 6, products: 1240, invoicesThisMonth: 812, lastActive: dayFrom(0) }),
  biz({ id: 2, name: "Cloud Nine Vapes", ownerName: "Ahmed Raza", ownerEmail: "ahmed@cloudnine.example", ownerMobile: "+1 555 300 1002", username: "cloudnine", city: "Dallas", locationName: "Deep Ellum", address: "2700 Elm St, Dallas, TX", createdAt: dayFrom(-266), locations: 2, users: 9, products: 3120, invoicesThisMonth: 1420, lastActive: dayFrom(0) }),
  biz({ id: 3, name: "Smoke Hut", ownerName: "Bilal Khan", ownerEmail: "bilal@smokehut.example", ownerMobile: "+1 555 300 1003", username: "smokehut", city: "Houston", locationName: "Main", address: "910 Westheimer Rd, Houston, TX", createdAt: dayFrom(-200), locations: 1, users: 3, products: 640, invoicesThisMonth: 390, lastActive: dayFrom(-1) }),
  biz({ id: 4, name: "Hookah Lounge Supply", ownerName: "Sara Malik", ownerEmail: "sara@hookahlounge.example", ownerMobile: "+1 555 300 1004", username: "hookahlounge", city: "Austin", locationName: "Warehouse", address: "1200 E 6th St, Austin, TX", createdAt: dayFrom(-170), locations: 5, users: 18, products: 7400, invoicesThisMonth: 2960, lastActive: dayFrom(0) }),
  biz({ id: 5, name: "Vapor Point", ownerName: "Usman Tariq", ownerEmail: "usman@vaporpoint.example", ownerMobile: "+1 555 300 1005", username: "vaporpoint", city: "San Antonio", locationName: "Main", address: "300 Alamo Plaza, San Antonio, TX", createdAt: dayFrom(-125), locations: 1, users: 2, products: 410, invoicesThisMonth: 120, lastActive: dayFrom(-3) }),
  biz({ id: 6, name: "Puff Palace", ownerName: "Hina Javed", ownerEmail: "hina@puffpalace.example", ownerMobile: "+1 555 300 1006", username: "puffpalace", city: "El Paso", locationName: "Mesa St", address: "5000 N Mesa St, El Paso, TX", createdAt: dayFrom(-110), locations: 3, users: 5, products: 1880, invoicesThisMonth: 640, lastActive: dayFrom(-1) }),
  biz({ id: 7, name: "Lone Star Vapes", ownerName: "Kamran Ali", ownerEmail: "kamran@lonestar.example", ownerMobile: "+1 555 300 1007", username: "lonestar", city: "Plano", locationName: "Main", address: "", createdAt: dayFrom(-90), locations: 1, users: 3, products: 520, invoicesThisMonth: 0, lastActive: dayFrom(-12) }),
  biz({ id: 8, name: "Desert Smoke Co", ownerName: "Moeez Ali", ownerEmail: "moeez@desertsmoke.example", ownerMobile: "+1 555 300 1008", username: "desertsmoke", city: "Phoenix", timezone: "America/Phoenix", locationName: "Main", address: "", createdAt: dayFrom(-130), locations: 1, users: 2, products: 300, invoicesThisMonth: 0, lastActive: dayFrom(-21) }),
  biz({ id: 9, name: "Metro Tobacco", ownerName: "Zohaib Ahmed", ownerEmail: "zohaib@metrotobacco.example", ownerMobile: "+1 555 300 1009", username: "metrotobacco", city: "Chicago", locationName: "Loop", address: "", createdAt: dayFrom(-75), suspended: true, suspendReason: "Owner asked to pause the account while the shop is renovated.", locations: 1, users: 1, products: 90, invoicesThisMonth: 0, lastActive: dayFrom(-25), notes: "Renovation done by the end of next month, they say." }),
  biz({ id: 10, name: "Austin Glass Works", ownerName: "Ayesha Noor", ownerEmail: "ayesha@austinglass.example", ownerMobile: "+1 555 300 1010", username: "austinglass", city: "Austin", locationName: "South Congress", address: "", createdAt: dayFrom(-9), locations: 1, users: 2, products: 150, invoicesThisMonth: 44, lastActive: dayFrom(0) }),
  biz({ id: 11, name: "Sunrise Mart", ownerName: "Faisal Iqbal", ownerEmail: "faisal@sunrisemart.example", ownerMobile: "+1 555 300 1011", username: "sunrisemart", city: "Irving", locationName: "Main", address: "", createdAt: dayFrom(-4), locations: 1, users: 1, products: 35, invoicesThisMonth: 6, lastActive: dayFrom(-1) }),
  biz({ id: 12, name: "Green Leaf Supply", ownerName: "Nadia Shah", ownerEmail: "nadia@greenleaf.example", ownerMobile: "+1 555 300 1012", username: "greenleaf", city: "Tulsa", locationName: "Main", address: "", createdAt: dayFrom(-2), locations: 1, users: 1, products: 0, invoicesThisMonth: 0, lastActive: dayFrom(-2) }),
];

const businesses = createDemoStore<Business>("opalpay.platform-businesses", DEMO_BUSINESSES);
export const useBusinesses = businesses.use;
export const updateBusinesses = businesses.update;

// ---------- subscriptions ----------

export const PAY_METHODS = ["Card", "Bank transfer", "Cash"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

/**
 * The card a business pays with. Only what's safe to keep is stored: the
 * full number and CVC go to the payment provider (Stripe), never here.
 */
export type CardOnFile = { brand: string; last4: string; expMonth: number; expYear: number; holder: string };

/** What one business has bought. A business has at most one. */
export type Subscription = {
  businessId: number;
  /** null: single features only (no plan). */
  planId: number | null;
  /** Add-on feature keys bought on their own (on top of the plan, or instead of one). */
  addOns: string[];
  extraLocations: number;
  extraUsers: number;
  cycle: Cycle;
  /** How the business pays: cards renew on their own, bank and cash get an unpaid invoice. */
  method: PayMethod;
  startDate: string;
  /** Last free day, or "" for no trial. */
  trialEndDate: string;
  /** The billing period running now (or the first one, during a trial). */
  periodStart: string;
  periodEnd: string;
  autoRenew: boolean;
  /** An agreed price that replaces the worked-out total; null = list price. */
  customPrice: number | null;
  /** When auto renewal was switched off. */
  cancelledAt: string;
  /** The card renewals are charged to, when paying by card. */
  card?: CardOnFile | null;
};

// the subscription store is created below, once the seeds are built
// ---------- invoices ----------

export type InvoiceLine = { label: string; amount: number };
export type InvoiceStatus = "Paid" | "Unpaid" | "Void";

export type Invoice = {
  id: number;
  invoiceNo: string;
  businessId: number;
  kind: "New" | "Renewal" | "Manual";
  date: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  lines: InvoiceLine[];
  total: number;
  status: InvoiceStatus;
  paidAt: string;
  method: PayMethod;
  ref: string;
  /** Dates reminders were sent. */
  reminders: string[];
};

// ---------- pricing ----------

/**
 * The invoice lines for a subscription: the plan, add-ons not already in
 * the plan, extra locations and users, and an adjustment line when an
 * agreed price applies.
 */
export function priceLines(sub: Pick<Subscription, "planId" | "addOns" | "extraLocations" | "extraUsers" | "cycle" | "customPrice">, allPlans: Plan[], allFeatures: Feature[]): InvoiceLine[] {
  const plan = allPlans.find((p) => p.id === sub.planId);
  const lines: InvoiceLine[] = [];
  const per = sub.cycle === "Monthly" ? "month" : "year";
  if (plan) lines.push({ label: `${plan.name} plan (${per})`, amount: planPrice(plan, sub.cycle) });
  for (const key of sub.addOns) {
    if (plan?.features.includes(key)) continue;
    const f = allFeatures.find((x) => x.key === key);
    if (f) lines.push({ label: `${f.name} (${per})`, amount: featurePrice(f, sub.cycle) });
  }
  const loc = allFeatures.find((f) => f.unit === "location");
  const user = allFeatures.find((f) => f.unit === "user");
  if (sub.extraLocations && loc) lines.push({ label: `${sub.extraLocations} extra location${sub.extraLocations === 1 ? "" : "s"} (${per})`, amount: sub.extraLocations * featurePrice(loc, sub.cycle) });
  if (sub.extraUsers && user) lines.push({ label: `${sub.extraUsers} extra user${sub.extraUsers === 1 ? "" : "s"} (${per})`, amount: sub.extraUsers * featurePrice(user, sub.cycle) });
  const listTotal = lines.reduce((t, l) => t + l.amount, 0);
  if (sub.customPrice !== null && sub.customPrice !== listTotal) lines.push({ label: "Agreed price adjustment", amount: sub.customPrice - listTotal });
  return lines;
}

export const linesTotal = (lines: InvoiceLine[]) => Math.round(lines.reduce((t, l) => t + l.amount, 0) * 100) / 100;

/** What one billing period costs. */
export const subscriptionPrice = (sub: Subscription, allPlans: Plan[], allFeatures: Feature[]) => linesTotal(priceLines(sub, allPlans, allFeatures));

/** The price spread over one month, for MRR. */
export const monthlyValue = (sub: Subscription, allPlans: Plan[], allFeatures: Feature[]) =>
  subscriptionPrice(sub, allPlans, allFeatures) / (sub.cycle === "Monthly" ? 1 : 12);

/** Every feature key the business can use: core, the plan's and its own add-ons. */
export function enabledFeatures(sub: Subscription | undefined, allPlans: Plan[], allFeatures: Feature[]) {
  const keys = new Set(allFeatures.filter((f) => f.core).map((f) => f.key));
  if (!sub) return keys;
  allPlans.find((p) => p.id === sub.planId)?.features.forEach((k) => keys.add(k));
  sub.addOns.forEach((k) => keys.add(k));
  return keys;
}

/** The business's limits: the plan's (or the base ones) plus extras. 0 = unlimited. */
export function limitsOf(sub: Subscription | undefined, allPlans: Plan[]) {
  const plan = allPlans.find((p) => p.id === sub?.planId);
  const base = plan ?? BASE_LIMITS;
  const plus = (limit: number, extra: number) => (limit === 0 ? 0 : limit + extra);
  return {
    locations: plus(base.locations, sub?.extraLocations ?? 0),
    users: plus(base.users, sub?.extraUsers ?? 0),
    products: base.products,
    invoices: base.invoices,
  };
}

/** "Pro", "Pro + 2 add-ons", "3 single features". */
export function subscriptionLabel(sub: Subscription | undefined, allPlans: Plan[]) {
  if (!sub) return "No plan";
  const plan = allPlans.find((p) => p.id === sub.planId);
  const extras = sub.addOns.filter((k) => !plan?.features.includes(k)).length + (sub.extraLocations ? 1 : 0) + (sub.extraUsers ? 1 : 0);
  if (!plan) return `${sub.addOns.length} single feature${sub.addOns.length === 1 ? "" : "s"}`;
  return extras ? `${plan.name} + ${extras} extra${extras === 1 ? "" : "s"}` : plan.name;
}

// ---------- seed: subscriptions and their invoice history ----------

const [BASIC, STANDARD, PRO, ENTERPRISE] = DEMO_PLANS;

type Seed = {
  sub: Omit<Subscription, "startDate" | "trialEndDate" | "periodEnd" | "cancelledAt" | "customPrice" | "extraLocations" | "extraUsers" | "addOns"> &
    Partial<Pick<Subscription, "cancelledAt" | "customPrice" | "extraLocations" | "extraUsers" | "addOns">>;
  /** Billing periods invoiced so far, the current one included. */
  billedPeriods: number;
  /** The current period's invoice is still unpaid. */
  currentUnpaid?: boolean;
  /** In a free trial: no invoice yet. */
  trialDays?: number;
};

const SEEDS: Seed[] = [
  { sub: { businessId: 1, planId: PRO.id, cycle: "Yearly", method: "Card", periodStart: dayFrom(-310), autoRenew: true }, billedPeriods: 1 },
  { sub: { businessId: 2, planId: STANDARD.id, addOns: ["stock_transfers"], extraUsers: 2, cycle: "Monthly", method: "Card", periodStart: dayFrom(-29), autoRenew: true }, billedPeriods: 8 },
  { sub: { businessId: 3, planId: BASIC.id, cycle: "Monthly", method: "Bank transfer", periodStart: dayFrom(-5), autoRenew: true }, billedPeriods: 6, currentUnpaid: true },
  { sub: { businessId: 4, planId: ENTERPRISE.id, cycle: "Monthly", method: "Bank transfer", periodStart: dayFrom(-18), autoRenew: true, customPrice: 229 }, billedPeriods: 5 },
  { sub: { businessId: 5, planId: null, addOns: ["purchases", "expenses", "opal_points"], cycle: "Monthly", method: "Card", periodStart: dayFrom(-31), autoRenew: true }, billedPeriods: 4 },
  { sub: { businessId: 6, planId: STANDARD.id, extraLocations: 1, cycle: "Monthly", method: "Card", periodStart: dayFrom(-6), autoRenew: true }, billedPeriods: 3 },
  { sub: { businessId: 7, planId: BASIC.id, cycle: "Monthly", method: "Card", periodStart: dayFrom(-41), autoRenew: false, cancelledAt: dayFrom(-20) }, billedPeriods: 2 },
  { sub: { businessId: 8, planId: BASIC.id, cycle: "Monthly", method: "Cash", periodStart: dayFrom(-23), autoRenew: true }, billedPeriods: 4, currentUnpaid: true },
  { sub: { businessId: 9, planId: BASIC.id, cycle: "Monthly", method: "Bank transfer", periodStart: dayFrom(-10), autoRenew: true }, billedPeriods: 2 },
  { sub: { businessId: 10, planId: STANDARD.id, cycle: "Monthly", method: "Card", periodStart: dayFrom(5), autoRenew: true }, billedPeriods: 0, trialDays: 14 },
  { sub: { businessId: 11, planId: PRO.id, cycle: "Monthly", method: "Card", periodStart: dayFrom(10), autoRenew: true }, billedPeriods: 0, trialDays: 14 },
];

/** Bank and cash invoices are due a few days after they're issued. */
export const DUE_DAYS = 3;

function buildSeeds() {
  const subs: Subscription[] = [];
  const invoices: Invoice[] = [];
  for (const seed of SEEDS) {
    const s = seed.sub;
    const periods = Array.from({ length: seed.billedPeriods }, (_, i) =>
      s.cycle === "Monthly" ? monthsBefore(s.periodStart, seed.billedPeriods - 1 - i) : monthsBefore(s.periodStart, 12 * (seed.billedPeriods - 1 - i)),
    );
    const firstStart = periods[0] ?? s.periodStart;
    const plan = DEMO_PLANS.find((p) => p.id === s.planId);
    const trialDays = seed.trialDays ?? plan?.trialDays ?? 0;
    const sub: Subscription = {
      addOns: [],
      extraLocations: 0,
      extraUsers: 0,
      customPrice: null,
      cancelledAt: "",
      ...s,
      startDate: dayFrom(-trialDays, firstStart),
      trialEndDate: trialDays ? dayFrom(-1, firstStart) : "",
      periodEnd: periodEndFor(s.periodStart, s.cycle),
      card:
        s.method === "Card"
          ? {
              brand: s.businessId % 3 === 0 ? "Mastercard" : "Visa",
              last4: String(4242 + s.businessId * 1117).slice(-4),
              expMonth: ((s.businessId * 5) % 12) + 1,
              expYear: 2027 + (s.businessId % 3),
              holder: DEMO_BUSINESSES.find((b) => b.id === s.businessId)?.ownerName ?? "",
            }
          : null,
    };
    subs.push(sub);
    periods.forEach((start, i) => {
      const unpaid = seed.currentUnpaid && i === periods.length - 1;
      const lines = priceLines(sub, DEMO_PLANS, DEMO_FEATURES);
      const card = sub.method === "Card";
      invoices.push({
        id: 0,
        invoiceNo: "",
        businessId: sub.businessId,
        kind: i === 0 ? "New" : "Renewal",
        date: start,
        dueDate: card ? start : dayFrom(DUE_DAYS, start),
        periodStart: start,
        periodEnd: periodEndFor(start, sub.cycle),
        lines,
        total: linesTotal(lines),
        status: unpaid ? "Unpaid" : "Paid",
        paidAt: unpaid ? "" : card ? start : dayFrom(1, start),
        method: sub.method,
        ref: unpaid ? "" : card ? `ch_${(sub.businessId * 7919 + i * 104729).toString(36)}` : sub.method === "Cash" ? "Cash receipt" : `Wire ${4400 + sub.businessId * 10 + i}`,
        reminders: unpaid && daysBetween(dayFrom(DUE_DAYS, start), today()) > 0 ? [dayFrom(DUE_DAYS + 1, start)] : [],
      });
    });
  }
  invoices.sort((a, b) => a.date.localeCompare(b.date) || a.businessId - b.businessId);
  invoices.forEach((inv, i) => {
    inv.id = i + 1;
    inv.invoiceNo = `OP-${inv.date.slice(0, 4)}-${String(i + 1).padStart(5, "0")}`;
  });
  return { subs, invoices };
}

const SEEDED = buildSeeds();
export const DEMO_SUBSCRIPTIONS = SEEDED.subs;
export const DEMO_INVOICES = SEEDED.invoices;

const subscriptionStore = createDemoStore<Subscription>("opalpay.platform-subscriptions-v3", DEMO_SUBSCRIPTIONS);
export const useSubscriptions = subscriptionStore.use;
export const updateSubscriptions = subscriptionStore.update;

const invoiceStore = createDemoStore<Invoice>("opalpay.platform-invoices", DEMO_INVOICES);
export const useInvoices = invoiceStore.use;
export const updateInvoices = invoiceStore.update;

/** Next "OP-2026-00042" number. */
export function nextInvoiceNo(all: Invoice[], prefix = "OP", on = today()) {
  const n = Math.max(0, ...all.map((i) => Number(i.invoiceNo.split("-").pop()) || 0)) + 1;
  return `${prefix}-${on.slice(0, 4)}-${String(n).padStart(5, "0")}`;
}

// ---------- status ----------

export type BizState = "Trial" | "Active" | "Past due" | "Suspended" | "Expired" | "No plan";
export const BIZ_STATES: BizState[] = ["Active", "Trial", "Past due", "Suspended", "Expired", "No plan"];

export const STATE_TONE: Record<BizState, "green" | "blue" | "amber" | "rose" | "neutral"> = {
  Active: "green",
  Trial: "blue",
  "Past due": "amber",
  Suspended: "rose",
  Expired: "neutral",
  "No plan": "neutral",
};

/** Where a business stands today, and why. */
export function businessStatus(
  b: Business,
  sub: Subscription | undefined,
  allInvoices: Invoice[],
  settings: Pick<PlatformSettings, "graceDays" | "autoSuspend">,
  on = today(),
) {
  const unpaid = allInvoices.filter((i) => i.businessId === b.id && i.status === "Unpaid");
  const overdueDays = Math.max(0, ...unpaid.map((i) => daysBetween(i.dueDate, on)));
  const unpaidTotal = unpaid.reduce((t, i) => t + i.total, 0);
  const inTrial = Boolean(sub?.trialEndDate) && on <= (sub?.trialEndDate ?? "");
  const renewalDue = Boolean(sub?.autoRenew) && on > (sub?.periodEnd ?? on);
  const nextBilling = !sub || !sub.autoRenew ? null : inTrial ? sub.periodStart : dayFrom(1, sub.periodEnd);

  let state: BizState;
  let reason = "";
  if (!sub) state = "No plan";
  else if (b.suspended) {
    state = "Suspended";
    reason = b.suspendReason || "Suspended by the platform team.";
  } else if (settings.autoSuspend && overdueDays > settings.graceDays) {
    state = "Suspended";
    reason = `Unpaid for ${days(overdueDays)} (grace period is ${days(settings.graceDays)}).`;
  } else if (overdueDays > 0) {
    state = "Past due";
    reason = `${USD.format(unpaidTotal)} overdue by ${days(overdueDays)}; suspended after ${days(settings.graceDays)}.`;
  } else if (inTrial) state = "Trial";
  else if (sub.autoRenew || on <= sub.periodEnd) state = "Active";
  else {
    state = "Expired";
    reason = `Not renewed; ended ${fmtDate(sub.periodEnd)}.`;
  }
  return { state, reason, overdueDays, unpaid, unpaidTotal, inTrial, renewalDue, nextBilling };
}

/**
 * The renewal run: for every auto-renewing subscription, issue the invoice
 * for each billing period that has started (card payments are charged at
 * once, bank and cash ones wait for payment) and move on to the next period.
 */
export function runRenewals(subs: Subscription[], invoices: Invoice[], allPlans: Plan[], allFeatures: Feature[], allBusinesses: Business[], prefix: string, on = today()) {
  const created: Invoice[] = [];
  const all = [...invoices];
  const nextSubs = subs.map((original) => {
    const sub = { ...original };
    if (!sub.autoRenew || allBusinesses.find((b) => b.id === sub.businessId)?.suspended) return sub;
    for (let guard = 0; guard < 36; guard++) {
      const hasInvoice = all.some((i) => i.businessId === sub.businessId && i.periodStart === sub.periodStart && i.status !== "Void");
      if (sub.periodStart <= on && !hasInvoice) {
        const lines = priceLines(sub, allPlans, allFeatures);
        const card = sub.method === "Card";
        const invoice: Invoice = {
          id: Math.max(0, ...all.map((i) => i.id)) + 1,
          invoiceNo: nextInvoiceNo(all, prefix, on),
          businessId: sub.businessId,
          kind: all.some((i) => i.businessId === sub.businessId) ? "Renewal" : "New",
          date: sub.periodStart,
          dueDate: card ? sub.periodStart : dayFrom(DUE_DAYS, sub.periodStart),
          periodStart: sub.periodStart,
          periodEnd: sub.periodEnd,
          lines,
          total: linesTotal(lines),
          status: card ? "Paid" : "Unpaid",
          paidAt: card ? sub.periodStart : "",
          method: sub.method,
          ref: card ? `ch_${Date.now().toString(36).slice(-6)}${sub.businessId}` : "",
          reminders: [],
        };
        all.push(invoice);
        created.push(invoice);
      }
      if (sub.periodEnd < on) {
        sub.periodStart = dayFrom(1, sub.periodEnd);
        sub.periodEnd = periodEndFor(sub.periodStart, sub.cycle);
      } else break;
    }
    return sub;
  });
  return { subs: nextSubs, invoices: all, created };
}

/** How many auto-renewing subscriptions have an invoice to issue today. */
export const renewalsDue = (subs: Subscription[], invoices: Invoice[], allBusinesses: Business[], on = today()) =>
  subs.filter(
    (s) =>
      s.autoRenew &&
      !allBusinesses.find((b) => b.id === s.businessId)?.suspended &&
      ((s.periodStart <= on && !invoices.some((i) => i.businessId === s.businessId && i.periodStart === s.periodStart && i.status !== "Void")) || s.periodEnd < on),
  ).length;

// ---------- platform users ----------

export const PLATFORM_ROLES = ["Super admin", "Support", "Billing"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const ROLE_HELP: Record<PlatformRole, string> = {
  "Super admin": "Everything, including the feature catalog, plans, settings and other admins.",
  Support: "Views businesses, logs in as them and sends messages. No billing.",
  Billing: "Subscriptions, invoices and payments. Can't change the catalog or settings.",
};

export type PlatformUser = {
  id: number;
  name: string;
  email: string;
  role: PlatformRole;
  active: boolean;
  twoFactor: boolean;
  lastLogin: string;
  createdAt: string;
};

export const DEMO_PLATFORM_USERS: PlatformUser[] = [
  { id: 1, name: "Adnan Ahmed", email: "adnan@opalpay.example", role: "Super admin", active: true, twoFactor: true, lastLogin: dayFrom(0), createdAt: dayFrom(-400) },
  { id: 2, name: "Sara Khan", email: "sara@opalpay.example", role: "Support", active: true, twoFactor: true, lastLogin: dayFrom(-1), createdAt: dayFrom(-200) },
  { id: 3, name: "Bilal Raza", email: "bilal@opalpay.example", role: "Billing", active: true, twoFactor: false, lastLogin: dayFrom(-6), createdAt: dayFrom(-120) },
  { id: 4, name: "Hina Malik", email: "hina@opalpay.example", role: "Support", active: false, twoFactor: false, lastLogin: dayFrom(-80), createdAt: dayFrom(-180) },
];

const platformUsers = createDemoStore<PlatformUser>("opalpay.platform-users", DEMO_PLATFORM_USERS);
export const usePlatformUsers = platformUsers.use;
export const updatePlatformUsers = platformUsers.update;

// ---------- settings ----------

export type PlatformSettings = {
  appName: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  timezone: string;
  allowSignup: boolean;
  defaultPlanId: number;
  defaultCycle: Cycle;
  /** Days an unpaid invoice may be overdue before the business is suspended. */
  graceDays: number;
  autoSuspend: boolean;
  /** Reminder before a renewal, in days. */
  remindBeforeDays: number;
  /** While unpaid, remind every N days. */
  remindEveryDays: number;
  cardEnabled: boolean;
  stripeKey: string;
  stripeSecret: string;
  bankEnabled: boolean;
  bankDetails: string;
  cashEnabled: boolean;
  cashInstructions: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpFromName: string;
  smtpFromEmail: string;
  invoicePrefix: string;
  invoiceTax: number;
  invoiceAddress: string;
  invoiceFooter: string;
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  appName: "Opal POS",
  supportEmail: "support@opalpay.example",
  supportPhone: "+1 555 010 0000",
  currency: "USD",
  timezone: "America/Chicago",
  allowSignup: true,
  defaultPlanId: 2,
  defaultCycle: "Monthly",
  graceDays: 7,
  autoSuspend: true,
  remindBeforeDays: 3,
  remindEveryDays: 3,
  cardEnabled: true,
  stripeKey: "pk_live_51Opal••••••••3Kq",
  stripeSecret: "sk_live_51Opal••••••••x9Z",
  bankEnabled: true,
  bankDetails: "Opal Pay LLC\nChase Bank · Routing 111000614 · Account ••••4471\nPut your invoice number in the memo.",
  cashEnabled: true,
  cashInstructions: "Pay at our Fort Worth office, Monday to Friday, 9 AM - 5 PM. Ask for a receipt.",
  smtpHost: "smtp.mailgun.org",
  smtpPort: "587",
  smtpUser: "postmaster@mg.opalpay.example",
  smtpFromName: "Opal POS",
  smtpFromEmail: "no-reply@opalpay.example",
  invoicePrefix: "OP",
  invoiceTax: 0,
  invoiceAddress: "Opal Pay LLC\nFort Worth, Texas\nUnited States, 76109",
  invoiceFooter: "Thank you for choosing Opal POS.",
};

const settings = createDemoStore<PlatformSettings>("opalpay.platform-settings-v2", [DEFAULT_SETTINGS]);
export const usePlatformSettings = () => settings.use()[0] ?? DEFAULT_SETTINGS;
export const savePlatformSettings = (next: PlatformSettings) => settings.update(() => [next]);

// ---------- communicator ----------

export const AUDIENCES = ["All businesses", "By plan", "Selected businesses", "Trials ending", "Past due", "Suspended", "Expired"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const CHANNELS = ["Email", "In-app notification", "Email and in-app"] as const;
export type Channel = (typeof CHANNELS)[number];

export type PlatformMessage = {
  id: number;
  subject: string;
  body: string;
  audience: Audience;
  /** Plan ids or business ids, depending on the audience. */
  targetIds: number[];
  channel: Channel;
  recipients: number;
  sentAt: string;
  sentBy: string;
};

export const DEMO_MESSAGES: PlatformMessage[] = [
  { id: 1, subject: "Scheduled maintenance this Sunday", body: "Opal POS will be offline for about 20 minutes on Sunday at 3:00 AM CST while we upgrade our servers. Sales made on the POS screen will sync when we're back.", audience: "All businesses", targetIds: [], channel: "Email and in-app", recipients: 11, sentAt: `${dayFrom(-12)}T10:15`, sentBy: "Adnan Ahmed" },
  { id: 2, subject: "New: stock transfers between locations", body: "Pro plans now include Stock Transfers. On another plan? Add it from Settings -> Subscription for $10 a month.", audience: "By plan", targetIds: [2, 3], channel: "In-app notification", recipients: 5, sentAt: `${dayFrom(-6)}T14:40`, sentBy: "Sara Khan" },
  { id: 3, subject: "Your invoice is overdue", body: "Hi {owner_name}, invoice for {plan} is overdue. Please pay it to keep {business_name} running.", audience: "Past due", targetIds: [], channel: "Email", recipients: 1, sentAt: `${dayFrom(-1)}T09:00`, sentBy: "Bilal Raza" },
];

const messages = createDemoStore<PlatformMessage>("opalpay.platform-messages", DEMO_MESSAGES);
export const usePlatformMessages = messages.use;
export const updatePlatformMessages = messages.update;

// ---------- lists ----------

export const COUNTRIES = ["United States", "Canada", "United Kingdom", "Pakistan", "United Arab Emirates", "Australia"];
export const CURRENCIES = ["USD", "CAD", "GBP", "PKR", "AED", "AUD"];
export const TIMEZONES = ["America/Chicago", "America/New_York", "America/Denver", "America/Phoenix", "America/Los_Angeles", "Europe/London", "Asia/Karachi", "Asia/Dubai"];
