"use client";

import * as React from "react";

type Toast = { id: number; message: string; tone: "info" | "success" | "error" };
const ToastCtx = React.createContext<{
  push: (message: string, tone?: Toast["tone"]) => void;
}>({ push: () => {} });

export function useToast() {
  return React.useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback(
    (message: string, tone: Toast["tone"] = "info") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, tone }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
    },
    [],
  );
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[120] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="chrome pointer-events-auto max-w-sm animate-slide-up rounded-2xl px-4 py-2.5 text-sm text-gray-900 shadow-chrome"
          >
            <span
              className={
                t.tone === "error"
                  ? "text-red-600"
                  : t.tone === "success"
                    ? "text-emerald-700"
                    : "text-gray-900"
              }
            >
              {t.message}
            </span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
