"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button, Field, Input, Spinner, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export function AddLeadDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (id: string) => void }) {
  const { push } = useToast();
  const [f, setF] = React.useState({ name: "", phone: "", category: "", address: "", website: "", notes: "" });
  const [busy, setBusy] = React.useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: [Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim()))] }),
    }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return push(d?.error ?? "Couldn't add lead", "error");
    if (!d.imported) return push(d.skipped?.dnc ? "That number is on the do-not-contact list." : "A lead with that phone number already exists.", "error");
    push("Lead added", "success");
    setF({ name: "", phone: "", category: "", address: "", website: "", notes: "" });
    onDone(d.businessIds[0]);
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] grid place-items-end bg-black/50 sm:place-items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-chrome sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Add a lead</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <Field label="Business name *">
          <Input value={f.name} onChange={set("name")} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <Input value={f.phone} onChange={set("phone")} inputMode="tel" />
          </Field>
          <Field label="Category">
            <Input value={f.category} onChange={set("category")} placeholder="Salon, Gym…" />
          </Field>
        </div>
        <Field label="Address">
          <Input value={f.address} onChange={set("address")} />
        </Field>
        <Field label="Website (if any)">
          <Input value={f.website} onChange={set("website")} placeholder="https://" />
        </Field>
        <Field label="Notes for the rep">
          <Textarea rows={2} value={f.notes} onChange={set("notes")} />
        </Field>
        <Button type="submit" className="w-full" disabled={busy || !f.name.trim()}>
          {busy ? <Spinner /> : "Add lead"}
        </Button>
      </form>
    </div>
  );
}
