"use client";

/**
 * Modal built on the native <dialog>: the browser handles the backdrop,
 * focus trapping and Escape. Render it only while open — it calls
 * `showModal()` on mount. Clicking the backdrop closes it too.
 */

import { useEffect, useRef, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    // keep the page behind from scrolling while the modal is up
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      // Escape fires "cancel"; let the parent unmount us instead of the browser closing
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // a click on the dialog element itself (not its content) is a backdrop click
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-3xl overflow-hidden rounded-2xl border border-line bg-background p-0 text-foreground shadow-2xl shadow-navy-950/25",
        "backdrop:bg-navy-950/45 backdrop:backdrop-blur-[2px]",
        "animate-[menu-in_160ms_ease-out]",
        className,
      )}
    >
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1.5 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface/60 px-6 py-3">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}
