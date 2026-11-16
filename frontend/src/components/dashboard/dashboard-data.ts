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

export type SalesRange = "7D" | "30D" | "12M";

/** Static data behind the 7D / 30D / 12M tabs on the sales overview card. */
export const SALES_RANGES: Record<
  SalesRange,
  {
    description: string;
    points: Array<{ label: string; value: number }>;
    ticks: number[];
    tickEvery: number;
    total: string;
    delta: { value: string; direction: "up" | "down" };
  }
> = {
  "7D": {
    description: "Sales over the last 7 days",
    points: [
      { label: "Aug 11", value: 720 },
      { label: "Aug 12", value: 940 },
      { label: "Aug 13", value: 810 },
      { label: "Aug 14", value: 1060 },
      { label: "Aug 15", value: 980 },
      { label: "Aug 16", value: 1240 },
      { label: "Aug 17", value: 1130 },
    ],
    ticks: [0, 300, 600, 900, 1200, 1500],
    tickEvery: 1,
    total: "$6,880.00",
    delta: { value: "-3.4%", direction: "down" },
  },
  "30D": {
    description: "Sales over the last 30 days",
    points: SALES_SERIES,
    ticks: [0, 500, 1000, 1500, 2000, 2500],
    tickEvery: 2,
    total: "$24,580.00",
    delta: { value: "+12.5%", direction: "up" },
  },
  "12M": {
    description: "Sales over the last 12 months",
    points: [
      { label: "Sep", value: 18400 },
      { label: "Oct", value: 19950 },
      { label: "Nov", value: 23600 },
      { label: "Dec", value: 27800 },
      { label: "Jan", value: 17900 },
      { label: "Feb", value: 18700 },
      { label: "Mar", value: 21300 },
      { label: "Apr", value: 20600 },
      { label: "May", value: 22900 },
      { label: "Jun", value: 24100 },
      { label: "Jul", value: 23200 },
      { label: "Aug", value: 24580 },
    ],
    ticks: [0, 6000, 12000, 18000, 24000, 30000],
    tickEvery: 1,
    total: "$263,030.00",
    delta: { value: "+18.2%", direction: "up" },
  },
};

/** Period picked in the dashboard header ("Last 30 days" button). */
export type DashboardRange = "today" | "7d" | "30d" | "12m";

export const DASHBOARD_RANGES: Array<{
  key: DashboardRange;
  label: string;
  /** Shown after each KPI delta, e.g. "vs previous 30 days". */
  compare: string;
  /** Chart tab that opens when this period is picked. */
  chart: SalesRange;
}> = [
  { key: "today", label: "Today", compare: "vs yesterday", chart: "7D" },
  { key: "7d", label: "Last 7 days", compare: "vs previous 7 days", chart: "7D" },
  { key: "30d", label: "Last 30 days", compare: "vs previous 30 days", chart: "30D" },
  { key: "12m", label: "Last 12 months", compare: "vs previous 12 months", chart: "12M" },
];

type Delta = Stat["delta"];

/** The four KPI cards, filled with one period's figures. */
function kpis(sales: string, s: Delta, net: string, n: Delta, due: string, d: Delta, returns: string, r: Delta): Stat[] {
  return [
    { label: "Total sales", value: sales, delta: s, icon: "chart", tone: "blue" },
    { label: "Net revenue", value: net, delta: n, icon: "dollar", tone: "green" },
    { label: "Invoice due", value: due, delta: d, icon: "receipt", tone: "amber" },
    { label: "Sales returns", value: returns, delta: r, icon: "refund", tone: "rose" },
  ];
}

export const STATS_BY_RANGE: Record<DashboardRange, Stat[]> = {
  today: kpis(
    "$1,130.00", { value: "-8.9%", direction: "down" },
    "$985.00", { value: "-6.2%", direction: "down" },
    "$420.00", { value: "+5.0%", direction: "up" },
    "$45.00", { value: "-25.0%", direction: "down" },
  ),
  "7d": kpis(
    "$6,880.00", { value: "-3.4%", direction: "down" },
    "$5,960.00", { value: "-1.8%", direction: "down" },
    "$1,180.00", { value: "+4.4%", direction: "up" },
    "$160.00", { value: "-12.5%", direction: "down" },
  ),
  "30d": STATS,
  "12m": kpis(
    "$263,030.00", { value: "+18.2%", direction: "up" },
    "$228,450.00", { value: "+15.6%", direction: "up" },
    "$9,870.00", { value: "+6.3%", direction: "up" },
    "$6,420.00", { value: "-4.8%", direction: "down" },
  ),
};

const SEGMENT_COLORS = {
  Sales: "var(--color-aqua-500)",
  Purchases: "var(--color-plum-500)",
  Returns: "var(--color-rose-500)",
} as const;

/** Donut segments for one period; the share is worked out from the values. */
function breakdown(sales: number, purchases: number, returns: number) {
  const total = sales + purchases + returns;
  return (Object.entries({ Sales: sales, Purchases: purchases, Returns: returns }) as Array<
    [keyof typeof SEGMENT_COLORS, number]
  >).map(([label, value]) => ({
    label,
    value,
    share: `${((value / total) * 100).toFixed(1)}%`,
    color: SEGMENT_COLORS[label],
  }));
}

export const REVENUE_BY_RANGE: Record<DashboardRange, ReturnType<typeof breakdown>> = {
  today: breakdown(1130, 640, 45),
  "7d": breakdown(6880, 3920, 160),
  "30d": breakdown(24580, 12450, 580),
  "12m": breakdown(263030, 141300, 6420),
};

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
