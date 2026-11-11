"use client";

/**
 * Card details for paying a subscription: name on card, number, expiry,
 * CVC and billing ZIP, with the brand worked out from the number, the
 * number spaced as it's typed, and the usual checks (Luhn, a future expiry,
 * a 3 or 4 digit CVC).
 *
 * DEMO: nothing is charged. In the live app these fields are the payment
 * provider's (Stripe Elements) and only the brand, last 4 digits and expiry
 * come back to be stored, which is all `toCardOnFile` keeps here too.
 */

import { useState } from "react";

import type { CardOnFile } from "@/components/platform/platform-data";
import { Field, inputClass } from "@/components/platform/platform-ui";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

export type CardInput = { holder: string; number: string; expiry: string; cvc: string; zip: string };
export const EMPTY_CARD: CardInput = { holder: "", number: "", expiry: "", cvc: "", zip: "" };

const digits = (v: string) => v.replace(/\D/g, "");

/** "Visa", "Mastercard", "Amex", "Discover" or "" while unknown. */
export function cardBrand(number: string) {
  const n = digits(number);
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(6011|65|64[4-9])/.test(n)) return "Discover";
  return "";
}

/** The Luhn checksum every card number carries. */
function luhn(number: string) {
  const n = digits(number);
  let sum = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return n.length > 0 && sum % 10 === 0;
}

/** "4242 4242 4242 4242"; Amex as 4-6-5. */
function spaced(value: string) {
  const n = digits(value).slice(0, 19);
  if (cardBrand(n) === "Amex") return [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)].filter(Boolean).join(" ");
  return n.replace(/(.{4})/g, "$1 ").trim();
}

/** "08 / 28" as it's typed. */
function expiryText(value: string) {
  const n = digits(value).slice(0, 4);
  return n.length > 2 ? `${n.slice(0, 2)} / ${n.slice(2)}` : n;
}

export function validateCard(c: CardInput) {
  const errors: Partial<Record<keyof CardInput, string>> = {};
  const brand = cardBrand(c.number);
  const n = digits(c.number);
  if (!c.holder.trim()) errors.holder = "Name on the card is required";
  if (!brand) errors.number = "Enter a Visa, Mastercard, Amex or Discover number";
  else if (n.length < (brand === "Amex" ? 15 : 16) || !luhn(n)) errors.number = "This card number isn't valid";
  const [mm, yy] = [Number(digits(c.expiry).slice(0, 2)), Number(digits(c.expiry).slice(2, 4))];
  const now = new Date();
  const thisYY = now.getFullYear() % 100;
  if (digits(c.expiry).length !== 4 || mm < 1 || mm > 12) errors.expiry = "Use MM / YY";
  else if (yy < thisYY || (yy === thisYY && mm < now.getMonth() + 1)) errors.expiry = "This card has expired";
  if (!new RegExp(`^\\d{${brand === "Amex" ? 4 : 3}}$`).test(digits(c.cvc))) errors.cvc = brand === "Amex" ? "4 digits on the front" : "3 digits on the back";
  if (!/^[A-Za-z0-9 -]{3,10}$/.test(c.zip.trim())) errors.zip = "Billing ZIP or postal code";
  return errors;
}

/** What is safe to keep: brand, last 4, expiry and the name. */
export function toCardOnFile(c: CardInput): CardOnFile {
  const n = digits(c.number);
  const e = digits(c.expiry);
  return { brand: cardBrand(n), last4: n.slice(-4), expMonth: Number(e.slice(0, 2)), expYear: 2000 + Number(e.slice(2, 4)), holder: c.holder.trim() };
}

/** "Visa •••• 4242 · expires 08/28". */
export function CardSummary({ card, className }: { card: CardOnFile; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide">{card.brand}</span>
      <span className="font-mono">•••• {card.last4}</span>
      <span className="text-xs text-muted">
        expires {String(card.expMonth).padStart(2, "0")}/{String(card.expYear).slice(-2)}
      </span>
    </span>
  );
}

export function CardFields({ value, onChange, errors = {} }: { value: CardInput; onChange: (v: CardInput) => void; errors?: Partial<Record<keyof CardInput, string>> }) {
  const set = (patch: Partial<CardInput>) => onChange({ ...value, ...patch });
  const brand = cardBrand(value.number);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Icon name="card" className="h-4 w-4 text-brand-500" />
          Card details
        </p>
        <span className="flex items-center gap-1 text-xs text-muted">
          <Icon name="lock" className="h-3.5 w-3.5" />
          Secured by Stripe
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name on card *" error={errors.holder} className="sm:col-span-2">
          <input aria-label="Name on card" autoComplete="cc-name" value={value.holder} onChange={(e) => set({ holder: e.target.value })} className={cn(inputClass, errors.holder && "border-red-500")} />
        </Field>
        <Field label="Card number *" error={errors.number} className="sm:col-span-2">
          <span className="relative block">
            <input
              aria-label="Card number"
              autoComplete="cc-number"
              inputMode="numeric"
              placeholder="1234 1234 1234 1234"
              value={value.number}
              onChange={(e) => set({ number: spaced(e.target.value) })}
              className={cn(inputClass, "pr-24 font-mono tracking-wide", errors.number && "border-red-500")}
            />
            {brand && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide">{brand}</span>
            )}
          </span>
        </Field>
        <Field label="Expiry *" error={errors.expiry}>
          <input aria-label="Expiry" autoComplete="cc-exp" inputMode="numeric" placeholder="MM / YY" value={value.expiry} onChange={(e) => set({ expiry: expiryText(e.target.value) })} className={cn(inputClass, "font-mono", errors.expiry && "border-red-500")} />
        </Field>
        <Field label="CVC *" error={errors.cvc}>
          <input aria-label="CVC" autoComplete="cc-csc" inputMode="numeric" placeholder={brand === "Amex" ? "1234" : "123"} value={value.cvc} onChange={(e) => set({ cvc: digits(e.target.value).slice(0, 4) })} className={cn(inputClass, "font-mono", errors.cvc && "border-red-500")} />
        </Field>
        <Field label="Billing ZIP *" error={errors.zip} className="sm:col-span-2">
          <input aria-label="Billing ZIP" autoComplete="postal-code" value={value.zip} onChange={(e) => set({ zip: e.target.value.slice(0, 10) })} className={cn(inputClass, errors.zip && "border-red-500")} />
        </Field>
      </div>
      <p className="text-xs text-muted">
        Demo: use test card <span className="font-mono">4242 4242 4242 4242</span>, any future expiry and any CVC. Nothing is charged.
      </p>
    </div>
  );
}

/** "Update card" popup: replaces the card renewals are charged to. */
export function UpdateCardDialog({ title = "Update card", onSave, onClose }: { title?: string; onSave: (card: CardOnFile) => void; onClose: () => void }) {
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [errors, setErrors] = useState<Partial<Record<keyof CardInput, string>>>({});
  return (
    <Modal
      title={title}
      description="Renewals are charged to this card from now on."
      onClose={onClose}
      className="max-w-lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={() => {
              const next = validateCard(card);
              setErrors(next);
              if (Object.keys(next).length === 0) onSave(toCardOnFile(card));
            }}
          >
            Save card
          </Button>
        </>
      }
    >
      <CardFields
        value={card}
        onChange={(v) => {
          setCard(v);
          setErrors({});
        }}
        errors={errors}
      />
    </Modal>
  );
}
