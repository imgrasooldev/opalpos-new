import { Icon } from "@/components/ui/icon";

type Props = {
  /** Breadcrumb ka aakhri hissa — abhi ek hi level. */
  section: string;
  store: { name: string };
  user: { name: string; initials: string };
  today: string;
};

export function ConsoleTopbar({ section, store, user, today }: Props) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-background px-5 py-3">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Icon name="chevron-right" className="h-4 w-4 text-muted" />
        <span className="font-medium">{section}</span>
      </nav>

      <div className="flex items-center gap-3">
        <label className="relative hidden xl:block">
          <span className="sr-only">Search</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            placeholder="Search anything..."
            className="w-64 rounded-lg border border-line bg-surface py-2 pl-9 pr-16 text-[13px] outline-none transition-colors placeholder:text-muted focus:border-brand-500 focus:bg-background"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-background px-1.5 py-0.5 text-[10px] text-muted">
            Ctrl + K
          </kbd>
        </label>

        <button
          type="button"
          className="hidden items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] transition-colors hover:bg-surface md:flex"
        >
          <Icon name="store" className="h-4 w-4 text-muted" />
          {store.name}
          <Icon name="chevron-down" className="h-4 w-4 text-muted" />
        </button>

        <span className="hidden items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] text-muted md:flex">
          <Icon name="calendar" className="h-4 w-4" />
          {today}
        </span>

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-muted transition-colors hover:bg-surface"
        >
          <Icon name="bell" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-semibold text-white">
            {user.initials}
          </span>
          <span className="text-[13px] font-medium">{user.name}</span>
          <Icon name="chevron-down" className="h-4 w-4 text-muted" />
        </button>
      </div>
    </header>
  );
}
