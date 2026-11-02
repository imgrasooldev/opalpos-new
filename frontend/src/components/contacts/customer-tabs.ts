/**
 * Tabs on the View Contact screen. Kept out of the client component so the
 * server page can read `?tab=` against the same list.
 */

import type { IconName } from "@/components/ui/icon";

export const TABS = [
  { key: "ledger", label: "Ledger", icon: "receipt" },
  { key: "sales", label: "Sales", icon: "tag" },
  { key: "documents", label: "Documents & Note", icon: "contact" },
  { key: "payments", label: "Payments", icon: "dollar" },
  { key: "points", label: "Opal Points", icon: "trend-up" },
  { key: "activities", label: "Activities", icon: "calendar" },
] as const satisfies readonly { key: string; label: string; icon: IconName }[];

export type TabKey = (typeof TABS)[number]["key"];

export function tabFromParam(param: string | undefined): TabKey {
  return TABS.find((t) => t.key === param)?.key ?? "ledger";
}
