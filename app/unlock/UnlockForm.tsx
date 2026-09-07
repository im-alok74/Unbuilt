"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

export function UnlockForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/map";

  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const [pin, setPin] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/unlock")
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(true));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (configured === false) {
      if (!/^\d{4,8}$/.test(pin)) return setErr("PIN must be 4–8 digits.");
      if (pin !== confirm) return setErr("PINs don't match.");
    }
    setBusy(true);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configured === false ? { newPin: pin } : { pin }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d?.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.replace(next);
    } catch {
      setErr("Network error.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-ink-950 px-6">
      <div className="w-full max-w-xs">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent">
            <Lock size={20} />
          </div>
          <h1 className="text-lg font-semibold text-white">Unbuilt</h1>
          <p className="text-xs text-white/45">
            {configured === false ? "Set a PIN to protect this app" : "Enter your PIN"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            autoFocus
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="PIN"
            className="w-full rounded-xl border border-white/12 bg-ink-900 px-4 py-3 text-center text-lg tracking-[0.4em] text-white placeholder:tracking-normal placeholder:text-white/30 focus:border-accent focus:outline-none"
          />
          {configured === false && (
            <input
              inputMode="numeric"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="Confirm PIN"
              className="w-full rounded-xl border border-white/12 bg-ink-900 px-4 py-3 text-center text-lg tracking-[0.4em] text-white placeholder:tracking-normal placeholder:text-white/30 focus:border-accent focus:outline-none"
            />
          )}
          {err && <p className="text-center text-xs text-red-400">{err}</p>}
          <button
            type="submit"
            disabled={busy || pin.length < 4}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-ink-950 disabled:opacity-50"
          >
            {busy ? "…" : configured === false ? "Set PIN & enter" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
