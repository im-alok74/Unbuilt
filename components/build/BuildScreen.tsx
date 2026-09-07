"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sparkles,
  RefreshCw,
  Eye,
  Rocket,
  ChevronDown,
  Check,
  ArrowLeft,
  Copy,
} from "lucide-react";
import { useBusinesses } from "@/lib/hooks";
import { useApp } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";
import { Button, Spinner, Input, ScoreBadge } from "@/components/ui/primitives";
import { TEMPLATES, getThemePalette } from "@/lib/templates";
import { SiteTemplate } from "@/components/build/SiteTemplate";
import { PhotoManager } from "@/components/build/PhotoManager";
import { SITE_STATUS_LABELS, type SiteContent, type SitePhoto, type SiteStatus, type BusinessRow } from "@/lib/types";
import { formatINR, cn } from "@/lib/utils";

interface SiteRec {
  id: string;
  businessId: string;
  slug: string;
  template: string;
  theme: string;
  contentJson: SiteContent;
  photosJson: SitePhoto[];
  quotePrice: number;
  status: SiteStatus;
  publishedUrl: string | null;
}

export function BuildScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const leadId = params.get("lead");
  const isNew = params.get("new") === "1";
  const { openDetail } = useApp();

  if (!leadId) return <LeadPicker onPick={(id) => router.push(`/build?lead=${id}`)} />;

  return <BuildForLead key={leadId} leadId={leadId} isNew={isNew} openDetail={openDetail} />;
}

function LeadPicker({ onPick }: { onPick: (id: string) => void }) {
  const { businesses, isLoading } = useBusinesses("sort=score&dir=desc");
  return (
    <div className="min-h-[100dvh] px-3 pb-28 pt-[max(14px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold text-white">Build a site</h1>
        <p className="mb-4 text-xs text-white/45">Pick a lead to build a one-page site for.</p>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-white/40">Loading…</p>
        ) : businesses.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/40">
            No leads yet — scan an area on the map first.
          </p>
        ) : (
          <div className="space-y-2">
            {businesses.map((b) => (
              <button
                key={b.id}
                onClick={() => onPick(b.id)}
                className="chrome flex w-full items-center justify-between rounded-2xl p-3 text-left"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{b.name}</span>
                    <ScoreBadge score={b.score} />
                  </div>
                  <span className="text-xs text-white/45">{b.categoryLabel ?? b.category}</span>
                </div>
                <div className="text-xs text-white/50">
                  {b.siteStatus ? SITE_STATUS_LABELS[b.siteStatus] : "New"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BuildForLead({
  leadId,
  isNew,
  openDetail,
}: {
  leadId: string;
  isNew: boolean;
  openDetail: (id: string) => void;
}) {
  const { push } = useToast();
  const { refreshAll } = useApp();
  const [business, setBusiness] = React.useState<BusinessRow | null>(null);
  const [site, setSite] = React.useState<SiteRec | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState<string | null>(null);
  const [regen, setRegen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const bres = await fetch(`/api/businesses/${leadId}`).then((r) => r.json());
    setBusiness(bres.business);
    if (bres.business?.siteId) {
      const sres = await fetch(`/api/sites/${bres.business.siteId}`).then((r) => r.json());
      setSite(sres.site);
    }
    setLoading(false);
  }, [leadId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function createWithTemplate(templateId: string) {
    setCreating(templateId);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: leadId, template: templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "failed");
      setSite(data.site);
      setBusiness(data.business);
      refreshAll();
      push("Site drafted — AI copy filled in", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Couldn't create site", "error");
    } finally {
      setCreating(null);
    }
  }

  const patch = React.useCallback(
    async (body: Record<string, unknown>, { silent = false } = {}) => {
      if (!site) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/sites/${site.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error();
        setSite(data.site);
        if (data.business) setBusiness(data.business);
        if (!silent) refreshAll();
      } catch {
        if (!silent) push("Save failed", "error");
      } finally {
        setSaving(false);
      }
    },
    [site, push, refreshAll],
  );

  function onContent(p: Partial<SiteContent>) {
    if (!site) return;
    setSite({ ...site, contentJson: { ...site.contentJson, ...p } });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => patch({ content: { ...site.contentJson, ...p } }, { silent: true }), 700);
  }

  async function regenerate() {
    if (!site) return;
    setRegen(true);
    try {
      const res = await fetch(`/api/sites/${site.id}/generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "failed");
      setSite(data.site);
      push(`Fresh copy generated`, "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Generation failed", "error");
    } finally {
      setRegen(false);
    }
  }

  async function publish() {
    if (!site) return;
    await patch({ status: "live" });
    const url = `${window.location.origin}/s/${site.slug}`;
    push("Site is live", "success");
    navigator.clipboard?.writeText(url).catch(() => {});
  }

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center text-white/50">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!business) {
    return <p className="p-10 text-center text-sm text-white/40">Lead not found.</p>;
  }

  // ── Template picker ─────────────────────────────────────────────────────────
  if (!site) {
    return (
      <div className="min-h-[100dvh] px-3 pb-28 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => history.back()}
            className="mb-2 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"
          >
            <ArrowLeft size={13} /> Back
          </button>
          <h1 className="text-xl font-semibold text-white">{business.name}</h1>
          <p className="mb-4 text-xs text-white/45">
            Pick a starter template. Copy is auto-written from the Google listing
            {isNew ? "" : ""}.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const pal = getThemePalette(t.defaultTheme);
              return (
                <button
                  key={t.id}
                  disabled={creating !== null}
                  onClick={() => createWithTemplate(t.id)}
                  className="chrome overflow-hidden rounded-2xl text-left transition hover:ring-2 hover:ring-accent/50 disabled:opacity-50"
                >
                  <div className="flex h-20 items-center gap-2 px-4" style={{ background: pal.surface }}>
                    <span className="h-8 w-8 rounded-full" style={{ background: pal.accent }} />
                    <span className="h-2 flex-1 rounded-full" style={{ background: pal.border }} />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{t.name}</span>
                      {creating === t.id && <Spinner className="h-3 w-3 text-accent" />}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-white/45">{t.blurb}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Editor ─────────────────────────────────────────────────────────────────
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/s/${site.slug}`;

  return (
    <div className="fixed inset-0 flex flex-col bg-ink-950">
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2 pt-[max(8px,env(safe-area-inset-top))]">
        <button
          onClick={() => history.back()}
          className="inline-flex items-center gap-1 text-xs text-white/55 hover:text-white"
        >
          <ArrowLeft size={14} /> {business.name}
        </button>
        <div className="flex items-center gap-2">
          {saving && <Spinner className="h-3.5 w-3.5 text-white/40" />}
          <button
            onClick={() => setPreview(true)}
            className="inline-flex items-center gap-1 rounded-full bg-white/8 px-3 py-1.5 text-xs text-white"
          >
            <Eye size={13} /> Preview
          </button>
          <Button size="sm" onClick={publish}>
            <Rocket size={13} /> {site.status === "live" ? "Re-publish" : "Mark live"}
          </Button>
        </div>
      </div>

      {/* preview canvas */}
      <div className="flex-1 overflow-y-auto bg-[#0f1216] p-3">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-white shadow-chrome">
          <SiteTemplate
            templateId={site.template}
            theme={site.theme}
            content={site.contentJson}
            photos={site.photosJson}
            editable
            onContent={onContent}
          />
        </div>
        <p className="py-3 text-center text-[11px] text-white/30">
          Click any text to edit it inline
        </p>
      </div>

      {/* controls */}
      <div className="border-t border-white/10 bg-ink-950">
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-white/60"
        >
          Site controls
          <ChevronDown size={16} className={cn("transition", panelOpen && "rotate-180")} />
        </button>
        {panelOpen && (
          <div className="max-h-[46vh] space-y-4 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-1">
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-white/50">Template</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => patch({ template: t.id })}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs",
                      site.template === t.id ? "bg-accent text-ink-950" : "bg-white/8 text-white/60",
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-medium text-white/50">Theme</p>
              <div className="flex flex-wrap gap-2">
                {(TEMPLATES.find((t) => t.id === site.template)?.themes ?? []).map((th) => {
                  const pal = getThemePalette(th);
                  return (
                    <button
                      key={th}
                      onClick={() => patch({ theme: th })}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs capitalize",
                        site.theme === th ? "border-accent text-white" : "border-white/10 text-white/55",
                      )}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ background: pal.accent }} />
                      {th}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-white/50">
                  Quote price (₹)
                </span>
                <Input
                  type="number"
                  defaultValue={site.quotePrice}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== site.quotePrice) patch({ quotePrice: v });
                  }}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-white/50">Status</span>
                <select
                  value={site.status}
                  onChange={(e) => patch({ status: e.target.value as SiteStatus })}
                  className="w-full rounded-xl border border-white/12 bg-ink-900 px-3 py-2 text-sm text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent to client</option>
                  <option value="live">Live</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs">
              <div>
                <p className="text-white/50">Suggested invoice</p>
                <p className="font-semibold text-white">{formatINR(site.quotePrice)}</p>
              </div>
              <Button size="sm" variant="subtle" onClick={regenerate} disabled={regen}>
                {regen ? <Spinner /> : <RefreshCw size={13} />} Regenerate copy
              </Button>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-medium text-white/50">Photos</p>
              <PhotoManager
                photos={site.photosJson}
                business={business}
                onChange={(photos) => {
                  setSite({ ...site, photosJson: photos });
                  patch({ photos }, { silent: true });
                }}
              />
            </div>

            {site.status === "live" && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                <Check size={14} className="shrink-0" />
                <span className="truncate">{shareUrl}</span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(shareUrl);
                    push("Link copied", "success");
                  }}
                  className="ml-auto shrink-0 rounded-full bg-emerald-500/20 p-1"
                >
                  <Copy size={12} />
                </button>
              </div>
            )}

            <button
              onClick={() => openDetail(leadId)}
              className="w-full rounded-xl border border-white/10 py-2 text-xs text-white/60 hover:text-white"
            >
              Open lead details
            </button>
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-2 pt-[max(8px,env(safe-area-inset-top))]">
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-white/60 hover:text-white"
            >
              {shareUrl}
            </a>
            <button
              onClick={() => setPreview(false)}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white"
            >
              Close preview
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
            <SiteTemplate
              templateId={site.template}
              theme={site.theme}
              content={site.contentJson}
              photos={site.photosJson}
            />
          </div>
        </div>
      )}
    </div>
  );
}
