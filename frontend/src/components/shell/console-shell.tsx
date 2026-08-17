/**
 * Logged-in console ka chhilka: dark sidebar + topbar + content area.
 *
 * Jaan boojh kar presentational hai — user/store props se aate hain, koi hook
 * andar nahi. Isi liye ise static demo page bhi use kar sakta hai aur baad mein
 * asli (auth-guarded) pages bhi, bas props ka source badlega.
 */

import type { ReactNode } from "react";

import { ConsoleSidebar } from "@/components/shell/console-sidebar";
import { ConsoleTopbar } from "@/components/shell/console-topbar";

type Props = {
  section: string;
  store: { name: string; hint: string };
  user: { name: string; role: string; initials: string };
  today: string;
  children: ReactNode;
};

export function ConsoleShell({
  section,
  store,
  user,
  today,
  children,
}: Props) {
  return (
    <div className="flex min-h-screen flex-1 bg-surface">
      <ConsoleSidebar store={store} user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <ConsoleTopbar
          section={section}
          store={store}
          user={user}
          today={today}
        />
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
