"use client";

import * as React from "react";
import useSWR from "swr";
import { Search, Upload, Plus, Download, UserPlus, Shuffle, X } from "lucide-react";
import { fetcher, useTeam } from "@/lib/hooks";
import { useApp } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";
import { Badge, Button, ScoreBadge, Select } from "@/components/ui/primitives";
import { StageBadge } from "@/components/rep/LeadRow";
import { ImportDialog } from "@/components/team/ImportDialog";
import { AddLeadDialog } from "@/components/team/AddLeadDialog";
import { STAGES, STAGE_LABELS, type BusinessRow, type Stage } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE = 100;

export function PoolScreen() {
  const { openDetail, lastScanAt } = useApp();
  const { push } = useToast();
  const { users } = useTeam();
  const reps = users.filter((u) => u.role === "rep" && u.isActive);

  const [q, setQ] = React.useState("");
  const [assigned, setAssigned] = React.useState("all");
  const [stage, setStage] = React.useState<Stage | "all">("all");
  const [noSite, setNoSite] = React.useState(false);
  const [minScore, setMinScore] = React.useState(0);
  const [limit, setLimit] = React.useState(PAGE);
  const [sel, setSel] = React.useState<Set<string>>(new Set());
  const [target, setTarget] = React.useState("");
  const [importOpen, setImportOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [conflicts, setConflicts] = React.useState<{ ids: string[]; userId: string | null; userIds?: string[] } | null>(null);

  const query = React.useMemo(() => {
    const p = new URLSearchParams({ total: "1", limit: String(limit) });
    if (q.trim()) p.set("search", q.trim());
    if (assigned !== "all") p.set("assignedTo", assigned);
    if (stage !== "all") p.set("stage", stage);
    if (noSite) p.set("noWebsiteOnly", "1");
    if (minScore) p.set("minScore", String(minScore));
    return p.toString();
  }, [q, assigned, stage, noSite, minScore, limit]);

  const { data, isLoading, mutate } = useSWR<{ businesses: BusinessRow[]; total: number }>(`/api/businesses?${query}`, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
  const rows = data?.businesses ?? [];

  React.useEffect(() => {
    mutate();
  }, [lastScanAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const allSelected = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  async function assign(body: { userId?: string | null; userIds?: string[]; force?: boolean }, ids = [...sel]) {
    setBusy(true);
    try {
      let assigned = 0;
      let unassigned = 0;
      let dnc = 0;
      const conflictIds: string[] = [];
      for (let i = 0; i < ids.length; i += 500) {
        const res = await fetch("/api/leads/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessIds: ids.slice(i, i + 500), ...body }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d?.error ?? "Couldn't assign");
        assigned += d.assigned ?? 0;
        unassigned += d.unassigned ?? 0;
        dnc += d.skippedDnc?.length ?? 0;
        conflictIds.push(...(d.conflicts ?? []).map((c: { id: string }) => c.id));
      }
      const parts = [unassigned ? `${unassigned} unassigned` : `${assigned} assigned`];
      if (dnc) parts.push(`${dnc} on do-not-contact list`);
      push(parts.join(" · "), "success");
      setConflicts(conflictIds.length ? { ids: conflictIds, userId: body.userId ?? null, userIds: body.userIds } : null);
      setSel(new Set());
      mutate();
    } catch (e) {
      push(e instanceof Error ? e.message : "Couldn't assign", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] px-3 pb-40 pt-[max(14px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Lead pool</h1>
            <p className="text-xs text-gray-400">{data?.total ?? "…"} leads</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="subtle" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add
            </Button>
            <Button size="sm" onClick={() => setImportOpen(true)}>
              <Upload size={14} /> Import
            </Button>
            <a
              href={`/api/export?${new URLSearchParams({ ...(q ? { search: q } : {}), ...(noSite ? { noWebsiteOnly: "1" } : {}) })}`}
              className="chrome grid h-8 w-8 place-items-center rounded-full text-accent"
              aria-label="Export CSV"
            >
              <Download size={14} />
            </a>
          </div>
        </header>

        <div className="chrome mb-3 flex h-11 items-center rounded-full px-4">
          <Search size={16} className="mr-2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Select value={assigned} onChange={(e) => setAssigned(e.target.value)} className="w-40">
            <option value="all">Everyone</option>
            <option value="unassigned">Unassigned</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.displayName}
              </option>
            ))}
          </Select>
          <Select value={stage} onChange={(e) => setStage(e.target.value as Stage | "all")} className="w-36">
            <option value="all">Any stage</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-32">
            <option value={0}>Any score</option>
            <option value={40}>40%+</option>
            <option value={60}>60%+</option>
            <option value={70}>70%+</option>
          </Select>
          <button
            onClick={() => setNoSite((v) => !v)}
            className={cn("rounded-full px-3 py-2 text-xs font-medium", noSite ? "bg-accent text-white" : "bg-gray-100 text-gray-600")}
          >
            No website
          </button>
        </div>

        {conflicts && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="flex-1">
              {conflicts.ids.length} lead{conflicts.ids.length === 1 ? " was" : "s were"} skipped: another rep already has the same phone number.
            </span>
            <Button
              size="sm"
              variant="subtle"
              disabled={busy}
              onClick={() => assign({ userId: conflicts.userId, userIds: conflicts.userIds, force: true }, conflicts.ids)}
            >
              Assign anyway
            </Button>
            <button onClick={() => setConflicts(null)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSel(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
              aria-label="Select all"
            />
            <span className="flex-1">Business</span>
            <span className="hidden w-16 sm:block">Score</span>
            <span className="hidden w-24 md:block">Stage</span>
            <span className="w-28 text-right sm:text-left">Assigned</span>
          </div>
          {rows.map((b) => (
            <div key={b.id} className={cn("flex items-center gap-3 border-t border-gray-100 px-4 py-2.5 first:border-0", sel.has(b.id) && "bg-accent-wash/60")}>
              <input type="checkbox" checked={sel.has(b.id)} onChange={() => toggle(b.id)} aria-label={`Select ${b.name}`} />
              <button onClick={() => openDetail(b.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-gray-900">{b.name}</p>
                <p className="truncate text-xs text-gray-400">
                  {b.categoryLabel ?? b.category ?? "—"}
                  {b.phone ? ` · ${b.phone}` : " · no phone"}
                </p>
              </button>
              <span className="hidden w-16 sm:block">
                <ScoreBadge score={b.score} />
              </span>
              <span className="hidden w-24 md:block">
                <StageBadge stage={b.stage} />
              </span>
              <span className="w-28 truncate text-right text-xs sm:text-left">
                {b.assignedToName ? <span className="text-gray-700">{b.assignedToName}</span> : <Badge tone="orange">Unassigned</Badge>}
              </span>
            </div>
          ))}
          {!isLoading && rows.length === 0 && <p className="py-14 text-center text-sm text-gray-400">No leads match. Scan the map or import a sheet.</p>}
        </div>

        {data && rows.length < data.total && (
          <div className="mt-3 text-center">
            <Button variant="subtle" onClick={() => setLimit((l) => l + PAGE)}>
              Load more ({data.total - rows.length} left)
            </Button>
          </div>
        )}
      </div>

      {sel.size > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-[92] flex justify-center px-3">
          <div className="chrome flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-2xl px-4 py-3 shadow-chrome">
            <span className="text-sm font-semibold text-gray-900">{sel.size} selected</span>
            <Select value={target} onChange={(e) => setTarget(e.target.value)} className="w-40 flex-1 sm:flex-none">
              <option value="">Choose rep…</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName} ({r.assigned})
                </option>
              ))}
            </Select>
            <Button size="sm" disabled={!target || busy} onClick={() => assign({ userId: target })}>
              <UserPlus size={14} /> Assign
            </Button>
            <Button size="sm" variant="subtle" disabled={busy || reps.length < 2} onClick={() => assign({ userIds: reps.map((r) => r.id) })}>
              <Shuffle size={14} /> Split across all reps
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => assign({ userId: null })}>
              Unassign
            </Button>
            <button onClick={() => setSel(new Set())} className="ml-auto text-xs text-gray-400 underline">
              Clear
            </button>
          </div>
        </div>
      )}

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={(ids) => {
          setAssigned("unassigned");
          setQ("");
          setSel(new Set(ids));
          mutate();
        }}
      />
      <AddLeadDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onDone={(id) => {
          setSel(new Set([id]));
          mutate();
        }}
      />
    </div>
  );
}
