"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { useCreateProduct } from "@/hooks/use-products";
import { ApiError } from "@/lib/api";

/**
 * Naya product banane ka form.
 *
 * Prices `string` mein rehte hain — backend Decimal deta/leta hai, `number`
 * mein badalne se paise mein rounding error aata hai.
 */
export function ProductForm({
  unitId,
  onCreated,
}: {
  unitId: number;
  onCreated?: () => void;
}) {
  const [name, setName] = useState("");
  const [sellPrice, setSellPrice] = useState("0.0000");
  const create = useCreateProduct();

  const fieldErrors =
    create.error instanceof ApiError ? create.error.fieldErrors() : {};
  const showFormError =
    create.error instanceof ApiError && Object.keys(fieldErrors).length === 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      {
        name,
        type: "single",
        unit_id: unitId,
        // sku khali -> backend khud SKU0001, SKU0002... banata hai
        variations: [{ default_sell_price: sellPrice }],
      },
      {
        onSuccess: () => {
          setName("");
          setSellPrice("0.0000");
          onCreated?.();
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
    >
      {showFormError && (
        <div className="w-full">
          <ErrorState error={create.error} />
        </div>
      )}

      <div className="min-w-56 flex-1">
        <Input
          label="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          error={fieldErrors["body.name"]}
        />
      </div>

      <div className="w-40">
        <Input
          label="Sell price"
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          inputMode="decimal"
          error={fieldErrors["body.variations.0.default_sell_price"]}
        />
      </div>

      <Button type="submit" loading={create.isPending}>
        Add product
      </Button>
    </form>
  );
}
