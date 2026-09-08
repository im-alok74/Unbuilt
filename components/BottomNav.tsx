"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Sparkles, LayoutGrid, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "drop", label: "Drop", icon: MapPin, href: "/map" },
  { key: "build", label: "Build", icon: Sparkles, href: "/build" },
  { key: "sites", label: "Sites", icon: LayoutGrid, href: "/sites" },
  { key: "you", label: "You", icon: User, href: "/you" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="chrome pointer-events-auto flex w-full max-w-sm items-center justify-between rounded-full px-2 py-2 shadow-chrome">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const active =
            it.href === "/map" ? pathname === "/map" : pathname.startsWith(it.href);
          return (
            <Link key={it.key} href={it.href} className="flex-1">
              <span
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[11px] font-semibold transition",
                  active ? "text-accent" : "text-gray-400 hover:text-gray-600",
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
