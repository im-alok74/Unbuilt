"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, User, Users, ListChecks, Bug } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "home", label: "Home", icon: Home, href: "/home" },
  { key: "pool", label: "Leads", icon: ListChecks, href: "/pool" },
  { key: "drop", label: "Find", icon: MapPin, href: "/map" },
  { key: "team", label: "Team", icon: Users, href: "/team" },
  { key: "issues", label: "Issues", icon: Bug, href: "/issues" },
  { key: "you", label: "You", icon: User, href: "/you" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="chrome pointer-events-auto flex w-full max-w-md items-center justify-between rounded-full px-2 py-2 shadow-chrome">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
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
