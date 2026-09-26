"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/primitives";

export function LoginForm() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d?.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      const next = new URLSearchParams(location.search).get("next");
      // Full navigation so the new cookie is sent on the first request.
      location.replace(next && next.startsWith("/") ? next : d.role === "rep" ? "/rep" : "/map");
    } catch {
      setErr("Network error.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-white px-6">
      <div className="w-full max-w-xs">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-wash text-accent">
            <Lock size={20} />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Unbuilt</h1>
          <p className="text-xs text-gray-400">Sign in to your account</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input
            autoFocus
            autoCapitalize="none"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          {err && <p className="text-center text-xs text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={busy || !username || !password}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
