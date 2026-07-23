"use client";

import type { ReactNode } from "react";

import { usePermission } from "@/hooks/use-auth";

/**
 * Permission ke hisaab se UI dikhana/chhupana.
 *
 *   <PermissionGate permission="product.create">
 *     <Button>New product</Button>
 *   </PermissionGate>
 *
 * NOTE: ye sirf UI hai. Asli rok backend ke `require_permission()` se lagti
 * hai — button chhupa dene ka matlab endpoint mehfooz hai, ye kabhi mat samajhna.
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can, isLoading } = usePermission();

  if (isLoading) return null;
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
