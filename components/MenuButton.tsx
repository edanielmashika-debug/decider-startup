"use client";

import { useEffect, useState } from "react";

type MenuItem = {
  icon: string;
  label: string;
  hint?: string; // small text on the right, for example "soon"
  disabled?: boolean;
  onSelect?: () => void;
};

export default function MenuButton({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);

  // Escape closes the menu (useful on a PC)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid size-12 place-items-center rounded-card bg-surface text-xl"
      >
        ⋯
      </button>

      {open && (
        <>
          {/* invisible layer: tapping anywhere outside closes the menu */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="menu-in absolute right-0 top-14 z-50 w-64 divide-y divide-foreground/10 overflow-hidden rounded-card border border-foreground/15 bg-surface shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
                className="flex min-h-12 w-full items-center gap-3 px-4 text-left disabled:opacity-50"
              >
                <span aria-hidden="true">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="text-xs opacity-70">{item.hint}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}