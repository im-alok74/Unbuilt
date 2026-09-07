"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MapPin, Radar, Sparkles, Layers, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app-context";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { mapMode, setMapMode } = useApp();

  const onMap = pathname === "/map";

  const items = [
    {
      key: "drop",
      label: "Drop",
      icon: MapPin,
      active: onMap && mapMode === "drop",
      onClick: () => {
        setMapMode("drop");
        if (!onMap) router.push("/map");
      },
    },
    {
      key: "scan",
      label: "Scan",
      icon: Radar,
      active: onMap && mapMode === "scan",
      onClick: () => {
        setMapMode("scan");
        if (!onMap) router.push("/map");
      },
    },
    {
      key: "build",
      label: "Build",
      icon: Sparkles,
      active: pathname.startsWith("/build"),
      href: "/build",
    },
    {
      key: "leads",
      label: "Leads",
      icon: Layers,
      active: pathname.startsWith("/leads"),
      href: "/leads",
    },
    {
      key: "you",
      label: "You",
      icon: User,
      active: pathname.startsWith("/you"),
      href: "/you",
    },
  ];

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="chrome pointer-events-auto flex w-full max-w-md items-center justify-between rounded-full px-2 py-2 shadow-chrome">
        {items.map((it) => {
          const Icon = it.icon;
          const inner = (
            <span
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-medium transition",
                it.active ? "text-accent" : "text-white/55 hover:text-white/80",
              )}
            >
              <Icon
                size={20}
                className={cn(it.active && "drop-shadow-[0_0_8px_rgba(245,166,35,0.55)]")}
                strokeWidth={it.active ? 2.4 : 2}
              />
              {it.label}
            </span>
          );
          return it.href ? (
            <Link key={it.key} href={it.href} className="flex-1">
              {inner}
            </Link>
          ) : (
            <button key={it.key} onClick={it.onClick} className="flex-1">
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
