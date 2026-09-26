"use client";

import * as React from "react";
import { SwrProvider } from "@/components/SwrProvider";
import { AppProvider } from "@/components/app-context";
import { ToastProvider } from "@/components/ui/toast";
import { BottomNav } from "@/components/BottomNav";
import { DetailPanel } from "@/components/DetailPanel";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SwrProvider><AppProvider>
      <ToastProvider>
        <div className="relative min-h-[100dvh] bg-canvas">
          {children}
          <BottomNav />
          <DetailPanel />
        </div>
      </ToastProvider>
    </AppProvider></SwrProvider>
  );
}
