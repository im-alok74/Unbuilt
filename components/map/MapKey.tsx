"use client";

import * as React from "react";
import { X } from "lucide-react";
import { PIN_HEX } from "@/lib/scoring/score";

const ROWS: { color: keyof typeof PIN_HEX; label: string; desc: string }[] = [
  { color: "orange", label: "No website", desc: "A business with no site yet. Tap it to build one." },
  {
    color: "pink",
    label: "Social page only",
    desc: "Only an Instagram, Facebook or link-in-bio page. No real site.",
  },
  { color: "green", label: "Website", desc: "This business already has a site." },
  { color: "blue", label: "Talking", desc: "You marked this one as in progress." },
  { color: "purple", label: "Client", desc: "You marked this one as a client." },
  { color: "red", label: "No-go", desc: "You marked this one to skip." },
];

export function MapKey({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="pointer-events-auto absolute left-3 top-[92px] z-[78] w-[min(88vw,320px)] animate-slide-up rounded-2xl bg-white p-4 shadow-chrome ring-1 ring-black/5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Map key
        </span>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close map key"
        >
          <X size={15} />
        </button>
      </div>
      <ul className="space-y-2.5">
        {ROWS.map((r) => (
          <li key={r.color} className="flex gap-2.5">
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
              style={{ background: PIN_HEX[r.color], boxShadow: `0 0 0 1px ${PIN_HEX[r.color]}55` }}
            />
            <div>
              <p className="text-sm font-semibold leading-tight text-gray-900">{r.label}</p>
              <p className="text-xs leading-snug text-gray-500">{r.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const KEY_SEEN = "unbuilt.mapkey.dismissed";

export function useMapKey() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    try {
      setOpen(localStorage.getItem(KEY_SEEN) !== "1");
    } catch {
      setOpen(true);
    }
  }, []);
  const close = React.useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(KEY_SEEN, "1");
    } catch {}
  }, []);
  const toggle = React.useCallback(() => setOpen((o) => !o), []);
  return { open, close, toggle };
}
