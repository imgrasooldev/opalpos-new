"use client";

import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { Product } from "@/types/product";

/**
 * "Presentational" component — data fetch nahi karta, sirf jo mila wo dikhata
 * hai aur actions parent ko wapas deta hai. Isi liye ye kisi bhi screen par
 * dobara use ho sakta hai.
 */
export function ProductTable({
  products,
  onDelete,
  deletingId,
}: {
  products: Product[];
  onDelete: (id: number) => void;
  deletingId?: number | null;
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>SKU</TH>
          <TH>Name</TH>
          <TH>Category</TH>
          <TH>Unit</TH>
          <TH className="text-right">Sell price</TH>
          <TH className="text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {products.map((product) => (
          <TR key={product.id}>
            <TD className="font-mono text-xs">{product.sku}</TD>
            <TD>
              {product.name}
              {product.is_inactive && (
                <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                  inactive
                </span>
              )}
            </TD>
            {/* nested relationships backend se aati hain */}
            <TD className="text-zinc-500">{product.category?.name ?? "-"}</TD>
            <TD className="text-zinc-500">{product.unit?.name ?? "-"}</TD>
            <TD className="text-right font-mono">
              {product.variations[0]?.default_sell_price ?? "-"}
            </TD>
            <TD className="text-right">
              <PermissionGate permission="product.delete">
                <Button
                  variant="ghost"
                  size="sm"
                  loading={deletingId === product.id}
                  onClick={() => onDelete(product.id)}
                  className="text-red-600"
                >
                  Delete
                </Button>
              </PermissionGate>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
