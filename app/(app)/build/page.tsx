import { Suspense } from "react";
import { BuildScreen } from "@/components/build/BuildScreen";

export default function BuildPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[100dvh] place-items-center text-white/40">Loading…</div>
      }
    >
      <BuildScreen />
    </Suspense>
  );
}
