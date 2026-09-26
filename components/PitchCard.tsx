"use client";

import * as React from "react";
import { Lightbulb, MessageCircle, ShieldQuestion, Tag } from "lucide-react";
import type { Pitch } from "@/lib/types";

/** pitchText is JSON for generated pitches, or plain text if a manager typed one by hand. */
export function parsePitch(t: string | null): Pitch | string | null {
  if (!t) return null;
  try {
    const j = JSON.parse(t);
    if (j && typeof j === "object" && j.opening) return j as Pitch;
  } catch {}
  return t;
}

export function PitchCard({ pitchText }: { pitchText: string | null }) {
  const p = parsePitch(pitchText);
  if (!p) return null;
  if (typeof p === "string") {
    return <div className="whitespace-pre-wrap rounded-2xl bg-accent-wash p-4 text-sm text-gray-800">{p}</div>;
  }
  return (
    <div className="space-y-3 rounded-2xl bg-accent-wash p-4 text-sm text-gray-800">
      <section>
        <h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-deep">
          <Lightbulb size={13} /> Why call them
        </h4>
        <p>{p.angle}</p>
      </section>
      <section>
        <h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-deep">
          <MessageCircle size={13} /> Say this first
        </h4>
        <p className="italic">“{p.opening}”</p>
      </section>
      <section>
        <h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-deep">
          <ShieldQuestion size={13} /> If they say…
        </h4>
        <ul className="space-y-2">
          {p.objections.map((o, i) => (
            <li key={i}>
              <p className="font-medium">{o.q}</p>
              <p className="text-gray-600">{o.a}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex items-center gap-1.5">
        <Tag size={13} className="text-accent-deep" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-accent-deep">Quote</span>
        <span className="font-semibold">{p.price}</span>
      </section>
    </div>
  );
}
