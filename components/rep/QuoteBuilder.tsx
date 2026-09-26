"use client";

import * as React from "react";
import { Calculator, MessageCircle, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { sendOrQueue } from "@/lib/offline";
import {
  KINDS,
  PAGES,
  EXTRAS,
  MIN_PRICE,
  MAX_PRICE,
  suggestPrice,
  packageForPrice,
  quoteMessage,
  inr,
  getPackage,
} from "@/lib/packages";
import { toWhatsappNumber, whatsappLink } from "@/lib/whatsapp";
import type { BusinessRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const chip = (on: boolean) =>
  cn(
    "rounded-2xl border px-3 py-2 text-left text-xs transition",
    on ? "border-accent bg-accent-wash text-accent-deep" : "border-gray-200 bg-white text-gray-700",
  );

export function QuoteBuilder({ b, repName, onSaved }: { b: BusinessRow; repName: string; onSaved: () => void }) {
  const { push } = useToast();
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState(b.websiteStatus === "real" ? "redesign" : "business");
  const [pages, setPages] = React.useState(6);
  const [extras, setExtras] = React.useState<string[]>([]);
  const [price, setPrice] = React.useState<number | null>(null);

  const s = suggestPrice({ kind, pages, extras });
  const shown = price ?? s.price;
  const pkg = packageForPrice(shown);
  const tooLow = shown < s.low;
  const wa = toWhatsappNumber(b.phone);

  // when the answers change, snap back to the new suggestion
  React.useEffect(() => setPrice(null), [kind, pages, extras.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(send: boolean) {
    const r = await sendOrQueue(`/api/my/leads/${b.id}`, "PATCH", {
      quote: { package: pkg.id, amount: shown },
      ...(send ? { log: { action: "whatsapped", detail: `Quote ${inr(shown)}` } } : {}),
    });
    if (r === "rejected") return push("Couldn't save the quote", "error");
    if (r === "queued") push("Saved offline, will sync", "info");
    else push(send ? "Quote sent and saved" : "Quote saved", "success");
    onSaved();
  }

  function send() {
    const msg = quoteMessage({ client: "", business: b.name, rep: repName, pkg, amount: shown });
    if (wa) window.open(whatsappLink(wa, msg), "_blank", "noopener");
    save(true);
  }

  const current = getPackage(b.quotePackage);

  return (
    <section className="card space-y-3 rounded-2xl p-3.5 shadow-card">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <Calculator size={13} /> Make a quote
        </span>
        <span className="text-xs text-accent">
          {b.quoteAmount ? `Sent ${inr(b.quoteAmount)}${current ? ` · ${current.name}` : ""}` : open ? "Hide" : "Open"}
        </span>
      </button>

      {open && (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-700">What does the client need?</p>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => (
                <button key={k.id} onClick={() => setKind(k.id)} className={chip(kind === k.id)}>
                  <span className="block font-medium">{k.label}</span>
                  {k.hint && <span className="block text-[11px] opacity-70">{k.hint}</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-700">How many pages?</p>
            <div className="flex flex-wrap gap-2">
              {PAGES.map((p) => (
                <button key={p.id} onClick={() => setPages(p.id)} className={chip(pages === p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-700">Anything extra? (tap all that apply)</p>
            <div className="flex flex-wrap gap-2">
              {EXTRAS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => setExtras((e) => (e.includes(x.id) ? e.filter((i) => i !== x.id) : [...e, x.id]))}
                  className={chip(extras.includes(x.id))}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl bg-accent-wash p-3.5">
            <p className="text-xs text-accent-deep">Suggested price</p>
            <p className="text-3xl font-bold text-gray-900">{inr(shown)}</p>
            <p className="text-xs text-gray-600">
              <b>{pkg.name}</b> package · usually {inr(s.low)} to {inr(s.high)} for this
            </p>
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={500}
              value={shown}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full accent-[#12B76A]"
              aria-label="Price"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{inr(MIN_PRICE)}</span>
              <span>{inr(MAX_PRICE)}</span>
            </div>
            {tooLow && (
              <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Lower than the usual price for this. Check with your manager before offering a big discount.
              </p>
            )}
            <div className="text-[11px] text-gray-600">
              <p className="font-medium">{pkg.promise}</p>
              <p>
                Delivery {pkg.timeline} · {pkg.support}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={send} disabled={!wa} className="bg-[#25D366] hover:bg-[#1fb857]">
              <MessageCircle size={16} /> Send on WhatsApp
            </Button>
            <Button variant="subtle" onClick={() => save(false)}>
              <Check size={16} /> Save only
            </Button>
          </div>
          {!wa && <p className="text-center text-[11px] text-gray-400">This lead has no phone number, so you can only save the quote.</p>}
        </div>
      )}
    </section>
  );
}
