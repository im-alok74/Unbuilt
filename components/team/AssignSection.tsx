"use client";

import * as React from "react";
import useSWR from "swr";
import { Sparkles } from "lucide-react";
import { fetcher, useTeam } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { Button, Select, Spinner, Textarea } from "@/components/ui/primitives";
import { PitchCard, parsePitch } from "@/components/PitchCard";
import { StageBadge, followUpLabel } from "@/components/rep/LeadRow";
import type { BusinessRow } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

interface Activity {
  id: string;
  action: string;
  detail: string | null;
  at: string;
  by: string | null;
}

export function AssignSection({ b, onChanged }: { b: BusinessRow; onChanged: () => void }) {
  const { push } = useToast();
  const { users, refresh } = useTeam();
  const reps = users.filter((u) => u.role === "rep" && u.isActive);
  const [rep, setRep] = React.useState(b.assignedTo ?? "");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState("");
  const { data } = useSWR<{ activity: Activity[] }>(`/api/my/leads/${b.id}`, fetcher, { revalidateOnFocus: false });

  React.useEffect(() => setRep(b.assignedTo ?? ""), [b.id, b.assignedTo]);

  async function assign(userId: string | null) {
    setBusy("assign");
    const r = await fetch("/api/leads/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessIds: [b.id], userId, force: true }),
    });
    const d = await r.json().catch(() => null);
    setBusy(null);
    if (!r.ok) return push(d?.error ?? "Couldn't assign", "error");
    if (d.skippedDnc?.length) return push("That number is on the do-not-contact list.", "error");
    push(userId ? "Assigned" : "Unassigned", "success");
    refresh();
    onChanged();
  }

  async function genPitch() {
    setBusy("pitch");
    const r = await fetch(`/api/leads/${b.id}/pitch`, { method: "POST" });
    setBusy(null);
    push(r.ok ? "Pitch ready" : "Couldn't generate pitch", r.ok ? "success" : "error");
    if (r.ok) onChanged();
  }

  async function savePitch() {
    setBusy("pitch");
    const r = await fetch(`/api/leads/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pitchText: text.trim() || null }),
    });
    setBusy(null);
    push(r.ok ? "Pitch saved" : "Couldn't save", r.ok ? "success" : "error");
    if (r.ok) {
      setEditing(false);
      onChanged();
    }
  }

  return (
    <div className="space-y-4 border-t border-gray-200 pt-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600">Assigned to</p>
        <div className="flex gap-2">
          <Select value={rep} onChange={(e) => setRep(e.target.value)}>
            <option value="">Unassigned</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.displayName} ({r.assigned} leads)
              </option>
            ))}
          </Select>
          <Button size="sm" disabled={busy !== null || rep === (b.assignedTo ?? "")} onClick={() => assign(rep || null)}>
            {busy === "assign" ? <Spinner /> : "Save"}
          </Button>
        </div>
        {b.assignedTo && (
          <p className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <StageBadge stage={b.stage} />
            {b.nextFollowUp && <span>Follow-up: {followUpLabel(b.nextFollowUp)}</span>}
            {b.projectValue ? <span>₹{b.projectValue.toLocaleString("en-IN")}</span> : null}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-600">Pitch for the rep</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const p = parsePitch(b.pitchText);
                setText(typeof p === "string" ? p : "");
                setEditing((v) => !v);
              }}
            >
              Write my own
            </Button>
            <Button size="sm" variant="subtle" disabled={busy !== null} onClick={genPitch}>
              {busy === "pitch" ? <Spinner /> : <Sparkles size={13} />} {b.pitchText ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Angle, opening line, objections, quote…" />
            <Button size="sm" onClick={savePitch} disabled={busy !== null}>
              Save pitch
            </Button>
          </div>
        ) : (
          <PitchCard pitchText={b.pitchText} />
        )}
      </div>

      {data && data.activity.length > 0 && (
        <details className="rounded-xl bg-gray-50 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-gray-600">Activity ({data.activity.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {data.activity.slice(0, 15).map((a) => (
              <li key={a.id} className="text-gray-600">
                <b className="font-medium">{a.action.replace(/_/g, " ")}</b>
                {a.detail && a.action !== "assigned" ? ` — ${a.detail}` : ""} · {a.by ?? "System"} · {timeAgo(a.at)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
