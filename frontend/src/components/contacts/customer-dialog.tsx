"use client";

/**
 * "Add a new contact" modal, same fields and order as the old Opal POS form:
 * contact type, individual/business, contact ID, customer group, phone
 * numbers, email, assigned to, and a "More information" section.
 *
 * Also used for Edit (pass `customer`). Saving returns the customer to the
 * parent; nothing is sent to a server yet.
 */

import { useState, type FormEvent, type ReactNode } from "react";

import {
  ASSIGNABLE_USERS,
  CUSTOMER_GROUPS,
  type DemoCustomer,
} from "@/components/contacts/customers-data";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";

type Errors = Partial<Record<"firstName" | "businessName" | "mobile" | "email", string>>;

const FORM_ID = "customer-form";

function splitName(name: string) {
  const match = name.match(/^(Mr|Mrs|Miss|Ms)\.?\s+(.*)$/i);
  const [first = "", ...rest] = (match ? match[2] : name).split(/\s+/);
  return { prefix: match?.[1] ?? "", first, last: rest.join(" ") };
}

export function CustomerDialog({
  customer,
  onClose,
  onSave,
}: {
  customer?: DemoCustomer;
  onClose: () => void;
  /** Gets the customer without a final contact ID when it was left empty. */
  onSave: (customer: DemoCustomer) => void;
}) {
  const editing = Boolean(customer);
  // Like the old form, nothing is picked at first and both name blocks show.
  // Individual hides the business name; Business hides the person's name.
  const [kind, setKind] = useState<"individual" | "business" | null>(null);
  const showBusiness = kind !== "individual";
  const showPerson = kind !== "business";
  const [moreOpen, setMoreOpen] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  // a business-only contact has its business name as its name — no person name to split
  const personName =
    customer && customer.name !== customer.businessName ? customer.name : "";
  const name = splitName(personName);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const number = (key: string) => Number(value(key)) || 0;

    const person = showPerson
      ? [value("prefix"), value("firstName"), value("middleName"), value("lastName")]
          .filter(Boolean)
          .join(" ")
      : "";
    const business = showBusiness ? value("businessName") : "";

    const next: Errors = {};
    if (kind === "business" && !business) next.businessName = "Business name is required";
    // first name is required unless the contact is clearly a business
    else if (kind !== "business" && !value("firstName") && !(kind === null && business))
      next.firstName = "First name is required";
    if (!value("mobile")) next.mobile = "Mobile is required";
    if (value("email") && !/^\S+@\S+\.\S+$/.test(value("email")))
      next.email = "Enter a valid email address";
    setErrors(next);
    // every required field sits above "More information", so no error is ever hidden
    if (Object.keys(next).length > 0) return;

    const payTerm = value("payTermNumber")
      ? `${value("payTermNumber")} ${value("payTermUnit")}`
      : null;
    const address = [value("address1"), value("address2"), value("city"), value("state"), value("country"), value("zip")]
      .filter(Boolean)
      .join(", ");

    onSave({
      id: customer?.id ?? Date.now(),
      contactId: value("contactId"),
      businessName: business || null,
      name: person || business,
      email: value("email") || null,
      taxNumber: value("taxNumber") || null,
      creditLimit: value("creditLimit") ? number("creditLimit") : null,
      payTerm,
      openingBalance: number("openingBalance"),
      advanceBalance: customer?.advanceBalance ?? 0,
      addedOn: customer?.addedOn ?? new Date().toISOString().slice(0, 10),
      opalPoints: customer?.opalPoints ?? 0,
      group: value("group") || null,
      address: address || null,
      mobile: value("mobile"),
      dob: value("dob") || null,
      saleDue: customer?.saleDue ?? 0,
      sellReturnDue: customer?.sellReturnDue ?? 0,
      lastSaleOn: customer?.lastSaleOn ?? null,
      assignedTo: value("assignedTo") ? Number(value("assignedTo")) : null,
      active: customer?.active ?? true,
      customFields: [1, 2, 3, 4, 5].map((i) => value(`custom${i}`) || null),
    });
  }

  return (
    <Modal
      title={editing ? "Edit contact" : "Add a new contact"}
      description={editing ? `Update ${customer!.name}'s details.` : "Create a customer you can sell to."}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" form={FORM_ID} variant="brand">
            {editing ? "Update" : "Save"}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={handleSubmit}
        // a field's error goes away as soon as it's edited
        onInput={(event) => {
          const field = (event.target as HTMLInputElement).name as keyof Errors;
          if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
        }}
        className="flex flex-col gap-5"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
          <IconSelect label="Contact type *" icon="users" name="contactType" defaultValue="customer">
            <option value="customer">Customers</option>
            <option value="supplier">Suppliers</option>
            <option value="both">Both (Supplier & Customer)</option>
          </IconSelect>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Contact is</legend>
            <div className="mt-1.5 inline-flex rounded-lg border border-line bg-surface p-0.5">
              {(["individual", "business"] as const).map((option) => (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-[13px] capitalize transition-colors",
                    kind === option
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={option}
                    checked={kind === option}
                    onChange={() => setKind(option)}
                    className="sr-only"
                  />
                  <Icon name={option === "individual" ? "users" : "store"} className="h-4 w-4" />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <Input
            name="contactId"
            label="Contact ID"
            placeholder="Contact ID"
            defaultValue={customer?.contactId}
            leading={<Icon name="contact" className="h-4 w-4" />}
            hint="Leave empty to autogenerate"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <IconSelect
            label="Customer group"
            icon="users"
            name="group"
            defaultValue={customer?.group ?? ""}
          >
            <option value="">None</option>
            {CUSTOMER_GROUPS.map((group) => (
              <option key={group}>{group}</option>
            ))}
          </IconSelect>
        </div>

        {showBusiness && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="businessName"
              label={kind === "business" ? "Business name *" : "Business name"}
              placeholder="Business name"
              defaultValue={customer?.businessName ?? undefined}
              leading={<Icon name="store" className="h-4 w-4" />}
              error={errors.businessName}
            />
          </div>
        )}

        {showPerson && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[110px_1fr_1fr_1fr]">
            <Input name="prefix" label="Prefix" placeholder="Mr / Mrs" defaultValue={name.prefix} />
            <Input
              name="firstName"
              label="First name *"
              placeholder="First name"
              defaultValue={name.first}
              error={errors.firstName}
            />
            <Input name="middleName" label="Middle name" placeholder="Middle name" />
            <Input name="lastName" label="Last name" placeholder="Last name" defaultValue={name.last} />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            name="mobile"
            type="tel"
            label="Mobile *"
            placeholder="Mobile"
            defaultValue={customer?.mobile ?? undefined}
            leading={<Icon name="phone" className="h-4 w-4" />}
            error={errors.mobile}
          />
          <Input
            name="altNumber"
            type="tel"
            label="Alternate number"
            placeholder="Alternate number"
            leading={<Icon name="phone" className="h-4 w-4" />}
          />
          <Input
            name="landline"
            type="tel"
            label="Landline"
            placeholder="Landline"
            leading={<Icon name="phone" className="h-4 w-4" />}
          />
          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="Email"
            defaultValue={customer?.email ?? undefined}
            leading={<Icon name="mail" className="h-4 w-4" />}
            error={errors.email}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="dob"
            type="date"
            label="Date of birth"
            defaultValue={customer?.dob ?? undefined}
          />
          <IconSelect
            label="Assigned to"
            icon="contact"
            name="assignedTo"
            defaultValue={customer?.assignedTo ? String(customer.assignedTo) : ""}
          >
            <option value="">Nobody</option>
            {ASSIGNABLE_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </IconSelect>
        </div>

        {/* "More information" — collapsed by default like the old form */}
        <div className="rounded-xl border border-line">
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[13px] font-medium transition-colors hover:bg-surface"
          >
            <span>
              More information
              <span className="ml-2 font-normal text-muted">
                Tax, balances, pay term, address, custom fields
              </span>
            </span>
            <Icon
              name="chevron-down"
              className={cn("h-4 w-4 text-muted transition-transform duration-300", moreOpen && "rotate-180")}
            />
          </button>

          {/* fields stay mounted while collapsed so their values are still submitted */}
          <div
            inert={!moreOpen}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              moreOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-4 border-t border-line px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    name="taxNumber"
                    label="Tax number"
                    placeholder="Tax number"
                    defaultValue={customer?.taxNumber ?? undefined}
                  />
                  <Input
                    name="openingBalance"
                    label="Opening balance"
                    placeholder="0.00"
                    inputMode="decimal"
                    defaultValue={customer?.openingBalance || undefined}
                  />
                  <PayTerm defaultValue={customer?.payTerm ?? null} />
                  <Input
                    name="creditLimit"
                    label="Credit limit"
                    placeholder="No limit"
                    inputMode="decimal"
                    defaultValue={customer?.creditLimit ?? undefined}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    name="address1"
                    label="Address line 1"
                    placeholder="Street, building"
                    defaultValue={customer?.address ?? undefined}
                  />
                  <Input name="address2" label="Address line 2" placeholder="Area, landmark" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Input name="city" label="City" placeholder="City" />
                  <Input name="state" label="State" placeholder="State" />
                  <Input name="country" label="Country" placeholder="Country" />
                  <Input name="zip" label="Zip code" placeholder="Zip code" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Input
                      key={i}
                      name={`custom${i}`}
                      label={`Custom field ${i}`}
                      defaultValue={customer?.customFields[i - 1] ?? undefined}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** Pay term: a number plus days/months, as one field. */
function PayTerm({ defaultValue }: { defaultValue: string | null }) {
  const [amount = "", unit = "days"] = defaultValue?.split(" ") ?? [];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pay term</span>
      <div className="flex rounded-lg border border-zinc-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900">
        <input
          name="payTermNumber"
          inputMode="numeric"
          placeholder="0"
          defaultValue={amount}
          className="w-full min-w-0 rounded-l-lg bg-transparent px-3 py-2.5 text-sm outline-none"
        />
        <select
          name="payTermUnit"
          defaultValue={unit}
          className="rounded-r-lg border-l border-zinc-300 bg-transparent px-2 text-sm outline-none dark:border-navy-700"
        >
          <option value="days">Days</option>
          <option value="months">Months</option>
        </select>
      </div>
    </div>
  );
}

function IconSelect({
  label,
  icon,
  name,
  defaultValue,
  children,
}: {
  label: string;
  icon: IconName;
  name: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <span className="relative">
        <Icon
          name={icon}
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        />
        <select
          name={name}
          defaultValue={defaultValue}
          className="w-full appearance-none rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-9 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900"
        >
          {children}
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
      </span>
    </label>
  );
}
