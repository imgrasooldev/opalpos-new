"use client";

/**
 * Tiny demo store for a list (products, sales, businesses, invoices …): kept
 * in memory and in localStorage, so changes survive reloads and are shared by
 * every tab of the browser. A change made in one tab (say the platform admin)
 * shows up in the others (say the shop's console) straight away.
 *
 * The server and the first client render see `initial`; saved changes
 * appear right after hydration, without a mismatch.
 *
 * STAND-IN FOR THE API — each list moves to its endpoint later.
 */

import { useSyncExternalStore } from "react";

/** Prefixes of every demo key, so "Reset demo data" can clear them all. */
export const DEMO_KEY_PREFIXES = ["opalpay.demo-", "opalpay.platform-", "opalpay.acting-business"];

export function createDemoStore<T>(key: string, initial: T[]) {
  let items: T[] | null = null;
  const listeners = new Set<() => void>();

  function load(): T[] {
    if (items) return items;
    try {
      const saved = localStorage.getItem(key);
      items = saved ? (JSON.parse(saved) as T[]) : initial;
    } catch {
      items = initial;
    }
    return items;
  }

  function onStorage(event: StorageEvent) {
    // another tab saved this list (or reset the demo): read it again
    if (event.key === key || event.key === null) {
      items = null;
      listeners.forEach((listener) => listener());
    }
  }

  function subscribe(listener: () => void) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  }

  function update(change: (prev: T[]) => T[]) {
    items = change(load());
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // storage blocked — changes still apply until the page is closed
    }
    listeners.forEach((listener) => listener());
  }

  function use() {
    return useSyncExternalStore(subscribe, load, () => initial);
  }

  return { use, update };
}

/** Wipe every saved demo change and start over from the built-in data. */
export function resetDemoData() {
  try {
    Object.keys(localStorage)
      .filter((k) => DEMO_KEY_PREFIXES.some((p) => k.startsWith(p)))
      .forEach((k) => localStorage.removeItem(k));
    Object.keys(sessionStorage)
      .filter((k) => DEMO_KEY_PREFIXES.some((p) => k.startsWith(p)))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // storage blocked — nothing was saved anyway
  }
}
