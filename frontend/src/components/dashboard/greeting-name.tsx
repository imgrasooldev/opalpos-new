"use client";

/**
 * The first name the dashboard greets: the demo's own user for the home
 * business, or the owner of whichever shop is signed in (a shop that just
 * registered, a demo shop, or one the platform admin logged in as).
 */

import { HOME_BUSINESS_ID, useBusinessAccess } from "@/components/platform/business-access";

export function GreetingName({ fallback }: { fallback: string }) {
  const { business } = useBusinessAccess();
  if (!business || business.id === HOME_BUSINESS_ID) return <>{fallback}</>;
  return <>{business.ownerName.split(" ")[0]}</>;
}
