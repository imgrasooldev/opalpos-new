/**
 * Dashboard ka saara demo content — ek hi jagah.
 *
 * ABHI YE POORA STATIC HAI: koi API call nahi hoti. Backend tayyar hone par
 * sirf ye file ki jagah hooks (`useDashboard()` waghera) lagane hain; cards
 * pehle se props par chalte hain, unka markup nahi badlega.
 */

import type { IconName } from "@/components/ui/icon";

export type Stat = {
  label: string;
  value: string;
  /** Pichle arse se farq — `null` matlab koi tabdeeli nahi. */
  delta: { value: string; direction: "up" | "down" | "flat" };
  icon: IconName;
  /** Icon tile ka rang — har KPI ka apna. */
  tone: "blue" | "green" | "amber" | "rose";
};

export const STATS: Stat[] = [
  {
    label: "Total sales",
    value: "$24,580.00",
    delta: { value: "+12.5%", direction: "up" },
    icon: "chart",
    tone: "blue",
  },
  {
    label: "Net revenue",
    value: "$21,340.00",
    delta: { value: "+8.2%", direction: "up" },
    icon: "dollar",
    tone: "green",
  },
  {
    label: "Invoice due",
    value: "$3,240.00",
    delta: { value: "0.0%", direction: "flat" },
    icon: "receipt",
    tone: "amber",
  },
  {
    label: "Sales returns",
    value: "$580.00",
    delta: { value: "-2.1%", direction: "down" },
    icon: "refund",
    tone: "rose",
  },
];

/** Sales overview — 30 din, har do din ka ek point. */
export const SALES_SERIES = [
  { label: "Jul 19", value: 920 },
  { label: "Jul 21", value: 1240 },
  { label: "Jul 22", value: 1060 },
  { label: "Jul 24", value: 1410 },
  { label: "Jul 25", value: 1180 },
  { label: "Jul 27", value: 1585 },
  { label: "Jul 28", value: 1320 },
  { label: "Jul 30", value: 1495 },
  { label: "Jul 31", value: 1265 },
  { label: "Aug 2", value: 1720 },
  { label: "Aug 3", value: 1460 },
  { label: "Aug 5", value: 1880 },
  { label: "Aug 6", value: 2090 },
  { label: "Aug 8", value: 1760 },
  { label: "Aug 9", value: 2180 },
  { label: "Aug 12", value: 1940 },
  { label: "Aug 15", value: 2240 },
  { label: "Aug 17", value: 2060 },
];

export const REVENUE_BREAKDOWN = [
  { label: "Sales", value: 24580, share: "68.4%", color: "var(--color-aqua-500)" },
  {
    label: "Purchases",
    value: 12450,
    share: "29.1%",
    color: "var(--color-plum-500)",
  },
  { label: "Returns", value: 580, share: "2.5%", color: "var(--color-rose-500)" },
];

export type AttentionItem = {
  label: string;
  count: number;
  icon: IconName;
  tone: "amber" | "rose" | "blue";
};

export const ATTENTION_ITEMS: AttentionItem[] = [
  { label: "Sales payment due", count: 3, icon: "alert", tone: "amber" },
  { label: "Purchase payment due", count: 2, icon: "cart", tone: "rose" },
  { label: "Low stock items", count: 5, icon: "cube", tone: "amber" },
  { label: "Pending shipments", count: 4, icon: "truck", tone: "blue" },
];

export type OrderStatus = "paid" | "pending" | "shipped";

export type Order = {
  id: string;
  customer: string;
  status: OrderStatus;
  total: string;
  date: string;
};

export const RECENT_ORDERS: Order[] = [
  {
    id: "SO-2026-00125",
    customer: "Tobacco & Beyond",
    status: "paid",
    total: "$1,450.00",
    date: "Aug 17, 2026 04:15 PM",
  },
  {
    id: "SO-2026-00124",
    customer: "City Retail Store",
    status: "pending",
    total: "$980.00",
    date: "Aug 17, 2026 01:30 PM",
  },
  {
    id: "SO-2026-00123",
    customer: "Smoke Hub",
    status: "shipped",
    total: "$2,350.00",
    date: "Aug 16, 2026 10:05 AM",
  },
  {
    id: "SO-2026-00122",
    customer: "Westside Traders",
    status: "paid",
    total: "$1,120.00",
    date: "Aug 16, 2026 09:20 AM",
  },
  {
    id: "SO-2026-00121",
    customer: "Premium Vapes",
    status: "pending",
    total: "$750.00",
    date: "Aug 15, 2026 06:45 PM",
  },
];

/** Shell (sidebar/topbar) ka demo user aur store. */
export const DEMO_SESSION = {
  user: { name: "Adnan", role: "Administrator", initials: "AA" },
  store: { name: "GR Store", hint: "Switch store" },
  today: "Aug 17, 2026",
};
