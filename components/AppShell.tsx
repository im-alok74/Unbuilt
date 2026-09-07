"use client";

import * as React from "react";
import { AppProvider } from "@/components/app-context";
import { ToastProvider } from "@/components/ui/toast";
import { BottomNav } from "@/components/BottomNav";
import { DetailPanel } from "@/components/DetailPanel";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ToastProvider>
        <div className="relative min-h-[100dvh] bg-ink-950">
          {children}
          <BottomNav />
          <DetailPanel />
        </div>
      </ToastProvider>
    </AppProvider>
  );
}
