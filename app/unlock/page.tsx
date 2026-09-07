import { Suspense } from "react";
import { UnlockForm } from "./UnlockForm";

export const metadata = { title: "Unbuilt — Locked" };

export default function UnlockPage() {
  return (
    <Suspense fallback={<div className="grid min-h-[100dvh] place-items-center text-white/40" />}>
      <UnlockForm />
    </Suspense>
  );
}
