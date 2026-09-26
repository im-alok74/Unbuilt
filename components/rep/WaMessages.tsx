"use client";

import * as React from "react";
import { MessageCircle, Send } from "lucide-react";
import { sendOrQueue } from "@/lib/offline";
import { waTemplates } from "@/lib/wamessages";
import { toWhatsappNumber, whatsappLink } from "@/lib/whatsapp";
import type { BusinessRow } from "@/lib/types";

/** One-tap WhatsApp messages. Opens WhatsApp with the text filled in and records it on the lead. */
export function WaMessages({ b, repName, onSent }: { b: BusinessRow; repName: string; onSent: () => void }) {
  const wa = toWhatsappNumber(b.phone);
  const [open, setOpen] = React.useState(false);
  const demo = b.siteSlug ? `${location.origin}/s/${b.siteSlug}` : "";
  const list = waTemplates({ business: b.name, rep: repName, rating: b.rating, hasWebsite: b.websiteStatus === "real", demoUrl: demo }).filter(
    (t) => t.id !== "demo" || demo,
  );

  async function send(id: string, text: string) {
    if (!wa) return;
    window.open(whatsappLink(wa, text), "_blank", "noopener");
    await sendOrQueue(`/api/my/leads/${b.id}`, "PATCH", { log: { action: "whatsapped", detail: list.find((t) => t.id === id)?.label } });
    onSent();
  }

  return (
    <section className="card space-y-2 rounded-2xl p-3.5 shadow-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <MessageCircle size={13} /> WhatsApp messages
        </span>
        <span className="text-xs text-accent">{open ? "Hide" : "Open"}</span>
      </button>
      {open && (
        <ul className="space-y-2">
          {list.map((t) => (
            <li key={t.id} className="rounded-2xl bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.label}</p>
                  <p className="text-[11px] text-gray-500">{t.when}</p>
                </div>
                <button
                  onClick={() => send(t.id, t.text)}
                  disabled={!wa}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  <Send size={12} /> Send
                </button>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-line text-[11px] text-gray-500">{t.text}</p>
            </li>
          ))}
          {!wa && <p className="text-center text-[11px] text-gray-400">No phone number on this lead.</p>}
        </ul>
      )}
    </section>
  );
}
