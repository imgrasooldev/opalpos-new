"use client";

/**
 * Tiny demo store for a list (variation templates, price groups, units …):
 * kept in memory and sessionStorage so changes survive navigation and reloads
 * in the same tab. The server and the first client render see `initial`;
 * saved changes appear right after hydration, without a mismatch.
 *
 * STAND-IN FOR THE API — each list moves to its endpoint later.
 */

import { useSyncExternalStore } from "react";

export function createDemoStore<T>(key: string, initial: T[]) {
  let items: T[] | null = null;
  const listeners = new Set<() => void>();

  function load(): T[] {
    if (items) return items;
    try {
      const saved = sessionStorage.getItem(key);
      items = saved ? (JSON.parse(saved) as T[]) : initial;
    } catch {
      items = initial;
    }
    return items;
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function update(change: (prev: T[]) => T[]) {
    items = change(load());
    try {
      sessionStorage.setItem(key, JSON.stringify(items));
    } catch {
      // storage blocked — changes still apply until the tab is closed
    }
    listeners.forEach((listener) => listener());
  }

  function use() {
    return useSyncExternalStore(subscribe, load, () => initial);
  }

  return { use, update };
}
