"use client";

import * as React from "react";
import { Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useApp } from "@/components/app-context";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types";

const ORDER: LeadStatus[] = ["not_contacted", "quoted", "won", "lost"];

export function StatusControl({
  businessId,
  value,
  onChanged,
  compact,
}: {
  businessId: string;
  value: LeadStatus;
  onChanged?: (s: LeadStatus) => void;
  compact?: boolean;
}) {
  const { push } = useToast();
  const { refreshAll } = useApp();
  const [pending, setPending] = React.useState(false);
  const [local, setLocal] = React.useState<LeadStatus>(value);
  React.useEffect(() => setLocal(value), [value]);

  async function change(next: LeadStatus) {
    setLocal(next);
    setPending(true);
    try {
      const res = await fetch(`/api/leads/${businessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      onChanged?.(next);
      refreshAll();
    } catch {
      setLocal(value);
      push("Couldn't update status", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Select
      value={local}
      disabled={pending}
      onChange={(e) => change(e.target.value as LeadStatus)}
      className={compact ? "h-8 py-1 text-xs" : ""}
      onClick={(e) => e.stopPropagation()}
    >
      {ORDER.map((s) => (
        <option key={s} value={s}>
          {LEAD_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
