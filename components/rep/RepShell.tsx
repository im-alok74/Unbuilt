"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, PlusCircle, BarChart3, WifiOff } from "lucide-react";
import { mutate } from "swr";
import { SwrProvider } from "@/components/SwrProvider";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { flushQueue, pendingCount } from "@/lib/offline";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Today", icon: Home, href: "/rep" },
  { label: "Leads", icon: List, href: "/rep/leads" },
  { label: "Request", icon: PlusCircle, href: "/rep/request" },
  { label: "Stats", icon: BarChart3, href: "/rep/stats" },
];

function Inner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { push } = useToast();
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    const sync = async () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine && pendingCount() > 0) {
        const n = await flushQueue();
        if (n) {
          push(`Synced ${n} offline update${n === 1 ? "" : "s"}`, "success");
          mutate((k) => typeof k === "string" && k.startsWith("/api/my"));
        }
      }
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [push]);

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-canvas pb-28">
      {offline && (
        <div className="sticky top-0 z-[80] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-medium text-white">
          <WifiOff size={13} /> Offline — updates will sync when you reconnect
        </div>
      )}
      {children}
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="chrome pointer-events-auto flex w-full max-w-sm items-center justify-between rounded-full px-2 py-2 shadow-chrome">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const active = it.href === "/rep" ? pathname === "/rep" : pathname.startsWith(it.href);
            return (
              <Link key={it.href} href={it.href} className="flex-1">
                <span
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[11px] font-semibold transition",
                    active ? "text-accent" : "text-gray-400",
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
    </div>
  );
}

export function RepShell({ children }: { children: React.ReactNode }) {
  return (
    <SwrProvider><ToastProvider>
      <Inner>{children}</Inner>
    </ToastProvider></SwrProvider>
  );
}
