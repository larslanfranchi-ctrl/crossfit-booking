"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, User } from "lucide-react";

const ITEMS = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/kalender", label: "Kalender", Icon: Calendar },
  { href: "/konto", label: "Profil", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-800 bg-stone-900">
      <div className="mx-auto flex max-w-5xl items-center justify-around pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
        {ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-1.5 text-xs ${
                isActive ? "text-white" : "text-stone-400"
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
