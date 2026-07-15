"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarCog,
  CreditCard,
  Dumbbell,
  LogOut,
  Menu,
  Tags,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";

const MEMBER_ITEMS = [{ href: "/abos", label: "Abos", Icon: Ticket }];

const ADMIN_ITEMS = [
  { href: "/admin", label: "Terminverwaltung", Icon: CalendarCog },
  { href: "/admin/stammdaten", label: "Kursangebote", Icon: Tags },
  { href: "/admin/trainings", label: "Trainings", Icon: Dumbbell },
  { href: "/admin/abos", label: "Abo-Verwaltung", Icon: CreditCard },
  { href: "/admin/nutzer", label: "Nutzer", Icon: Users },
];

// Gebündeltes Header-Menü statt einzelner Icons: Admins bekommen zusätzliche
// Einträge, alle Einträge tragen Text-Labels (Icon-Tooltips funktionieren
// auf Touch-Geräten nicht).
export function HeaderMenu({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  const items = isAdmin ? [...MEMBER_ITEMS, ...ADMIN_ITEMS] : MEMBER_ITEMS;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menü"
        aria-expanded={open}
        className="p-1 text-stone-500 hover:text-stone-900"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <>
          {/* Unsichtbare Klickfläche: schließt das Menü bei Klick daneben. */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-xl border border-stone-200 bg-stone-100 py-2 shadow-lg">
            {items.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-200 hover:text-stone-900"
              >
                <Icon size={18} className="text-stone-400" />
                {label}
              </Link>
            ))}
            <div className="my-2 border-t border-stone-200" />
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-200 hover:text-stone-900"
              >
                <LogOut size={18} className="text-stone-400" />
                Abmelden
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
