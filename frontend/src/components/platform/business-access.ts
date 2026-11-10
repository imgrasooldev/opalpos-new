"use client";

/**
 * Which business the business console is showing, and what it may use.
 *
 * The demo console is Glass Galaxy (business 1). "Log in as business" in the
 * platform admin switches it to another business for support; the console
 * then shows a banner to go back.
 *
 * Paid features decide the menu: a page whose feature the business hasn't
 * bought is hidden from the sidebar and shows an upgrade screen if opened
 * directly. A suspended or expired business sees the subscription screen
 * instead of any page.
 */

import { createDemoStore } from "@/components/inventory/demo-store";
import {
  businessStatus,
  enabledFeatures,
  useBusinesses,
  useFeatures,
  useInvoices,
  usePlans,
  usePlatformSettings,
  useSubscriptions,
} from "@/components/platform/platform-data";

/** The business the demo console belongs to. */
export const HOME_BUSINESS_ID = 1;

const acting = createDemoStore<{ id: number; viaPlatform: boolean }>("opalpay.acting-business", [{ id: HOME_BUSINESS_ID, viaPlatform: false }]);

/**
 * Who is signed in, for the demo: the shop console and the platform console
 * each have their own sign-in. Both start signed in, so links straight to a
 * screen keep working; "Sign out" sends you to that console's login page.
 */
const auth = createDemoStore<{ shop: boolean; platform: boolean }>("opalpay.demo-auth", [{ shop: true, platform: true }]);
export const useDemoAuth = () => auth.use()[0] ?? { shop: true, platform: true };

/** Shop login / sign-up: the console now belongs to this business. */
export function signInAsBusiness(id: number) {
  acting.update(() => [{ id, viaPlatform: false }]);
  auth.update((prev) => [{ ...(prev[0] ?? { platform: true }), shop: true }]);
}
export const signOutShop = () => auth.update((prev) => [{ ...(prev[0] ?? { platform: true }), shop: false }]);
export const signInPlatform = () => auth.update((prev) => [{ ...(prev[0] ?? { shop: true }), platform: true }]);
export const signOutPlatform = () => auth.update((prev) => [{ ...(prev[0] ?? { shop: true }), platform: false }]);

/** Platform admin -> "Log in as business". */
export function actAsBusiness(id: number) {
  acting.update(() => [{ id, viaPlatform: true }]);
  auth.update((prev) => [{ ...(prev[0] ?? { platform: true }), shop: true }]);
}
/** Back to the platform: the console belongs to its own business again. */
export const stopActing = () => acting.update(() => [{ id: HOME_BUSINESS_ID, viaPlatform: false }]);

export function useBusinessAccess() {
  const current = acting.use()[0] ?? { id: HOME_BUSINESS_ID, viaPlatform: false };
  const businesses = useBusinesses();
  const subs = useSubscriptions();
  const invoices = useInvoices();
  const plans = usePlans();
  const features = useFeatures();
  const settings = usePlatformSettings();
  const business = businesses.find((b) => b.id === current.id) ?? businesses.find((b) => b.id === HOME_BUSINESS_ID);
  const sub = subs.find((s) => s.businessId === business?.id);
  const status = business ? businessStatus(business, sub, invoices, settings) : undefined;
  return {
    business,
    sub,
    status,
    enabled: enabledFeatures(sub, plans, features),
    viaPlatform: current.viaPlatform,
    plans,
    features,
    invoices: invoices.filter((i) => i.businessId === business?.id),
  };
}

/**
 * The paid feature a business page needs, or null for core pages that every
 * business has. Matches the page path and everything under it.
 */
const PATH_FEATURES: [prefix: string, feature: string][] = [
  ["/purchases", "purchases"],
  ["/purchase-returns", "purchases"],
  ["/reports/purchase-payments", "purchases"],
  ["/reports/purchase-sale", "purchases"],
  ["/sales/create", "add_sale"],
  ["/sales/import", "add_sale"],
  ["/drafts", "add_sale"],
  ["/quotations", "add_sale"],
  ["/stock-transfers", "stock_transfers"],
  ["/stock-adjustments", "stock_adjustment"],
  ["/expenses", "expenses"],
  ["/expense-categories", "expenses"],
  ["/reports/opal-points", "opal_points"],
  ["/reports/tips", "tips"],
  ["/reports/cashier-commission", "cashier_commission"],
];

export function featureForPath(path: string) {
  return PATH_FEATURES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1] ?? null;
}
