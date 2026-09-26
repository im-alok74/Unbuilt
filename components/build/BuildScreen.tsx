"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  RefreshCw,
  Eye,
  Rocket,
  ChevronDown,
  Check,
  ArrowLeft,
  Copy,
  Wand2,
  Sparkles,
} from "lucide-react";
import { useBusinesses } from "@/lib/hooks";
import { useApp } from "@/components/app-context";
import { useToast } from "@/components/ui/toast";
import { Button, Spinner, Input, ScoreBadge } from "@/components/ui/primitives";
import { TEMPLATES, getTemplate, getThemePalette } from "@/lib/templates";
import { MOTION_PRESETS, type MotionPreset } from "@/lib/motion";
import { SiteTemplate } from "@/components/build/SiteTemplate";
import { TemplateThumb } from "@/components/build/TemplateThumb";
import { PhotoManager } from "@/components/build/PhotoManager";
import {
  SITE_STATUS_LABELS,
  type SiteContent,
  type SitePhoto,
  type SiteStatus,
  type BusinessRow,
} from "@/lib/types";
import { formatINR, cn } from "@/lib/utils";

interface SiteRec {
  id: string;
  businessId: string;
  slug: string;
  template: string;
  theme: string;
  motion: MotionPreset;
  brief: string;
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
        <h1 className="text-xl font-semibold text-gray-900">Build a site</h1>
        <p className="mb-4 text-xs text-gray-400">Pick a lead to build a one-page site for.</p>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
        ) : businesses.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
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
                    <span className="font-medium text-gray-900">{b.name}</span>
                    <ScoreBadge score={b.score} />
                  </div>
                  <span className="text-xs text-gray-400">{b.categoryLabel ?? b.category}</span>
                </div>
                <div className="text-xs text-gray-400">
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

/** Short starters so the brief box never faces the user as a blank page. */
const BRIEF_CHIPS = [
  "Family-run for over 20 years",
  "Best known for their biryani",
  "Takes bookings for parties and events",
  "Open late, popular with students",
  "Free home delivery within 5 km",
  "Certified staff, same-day callouts",
];

function BriefBox({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder: string;
}) {
  return (
    <div>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none"
      />
      <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
        {BRIEF_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(value ? `${value.replace(/\s*$/, "")}\n${chip}` : chip)}
            className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-200"
          >
            + {chip}
          </button>
        ))}
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
  const [brief, setBrief] = React.useState("");
  const [refine, setRefine] = React.useState("");
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
        body: JSON.stringify({ businessId: leadId, template: templateId, brief: brief.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "failed");
      setSite(data.site);
      setBusiness(data.business);
      refreshAll();
      push(brief.trim() ? "Site drafted from your brief" : "Site drafted — AI copy filled in", "success");
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
    saveTimer.current = setTimeout(
      () => patch({ content: { ...site.contentJson, ...p } }, { silent: true }),
      700,
    );
  }

  /** Regenerate the copy, optionally folding in a new instruction first. */
  async function regenerate(extra?: string) {
    if (!site) return;
    setRegen(true);
    try {
      const res = await fetch(`/api/sites/${site.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: extra ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "failed");
      setSite(data.site);
      setRefine("");
      push(extra ? "Rewritten with your note" : "Fresh copy generated", "success");
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
      <div className="grid min-h-[100dvh] place-items-center text-gray-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!business) {
    return <p className="p-10 text-center text-sm text-gray-400">Lead not found.</p>;
  }

  // ── Brief + template picker ─────────────────────────────────────────────────
  if (!site) {
    return (
      <div className="min-h-[100dvh] px-3 pb-28 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => history.back()}
            className="mb-2 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900"
          >
            <ArrowLeft size={13} /> Back
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{business.name}</h1>
          <p className="text-xs text-gray-400">
            {business.categoryLabel ?? business.category}
            {business.address ? ` · ${business.address}` : ""}
          </p>

          <div className="chrome mt-4 rounded-2xl p-3.5">
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-accent" />
              <h2 className="text-sm font-medium text-gray-900">Tell the writer about this place</h2>
            </div>
            <p className="mb-2.5 text-[11px] leading-relaxed text-gray-400">
              A line or two is enough. Anything you know that Google does not — what they are
              known for, who they serve, how long they have been around. Leave it blank and the
              copy is written from the listing alone. You can add more later.
            </p>
            <BriefBox
              value={brief}
              onChange={setBrief}
              placeholder={`e.g. Small family kitchen, been on this street since 2004. Famous for their mutton biryani on weekends. Mostly office lunch crowd, also takes party orders.`}
            />
          </div>

          <h2 className="mb-2 mt-5 text-sm font-medium text-gray-900">Pick a look</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                disabled={creating !== null}
                onClick={() => createWithTemplate(t.id)}
                className="chrome group overflow-hidden rounded-2xl text-left transition hover:ring-2 hover:ring-accent/50 disabled:opacity-50"
              >
                <TemplateThumb template={t} theme={t.defaultTheme} animate />
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{t.name}</span>
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] capitalize text-gray-500">
                      {t.motion}
                    </span>
                    {creating === t.id && <Spinner className="h-3 w-3 text-accent" />}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{t.blurb}</p>
                </div>
              </button>
            ))}
          </div>
          {creating && (
            <p className="py-4 text-center text-xs text-gray-400">
              Writing the copy for {business.name}…
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Editor ─────────────────────────────────────────────────────────────────
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/s/${site.slug}`;
  const tpl = getTemplate(site.template);

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 pt-[max(8px,env(safe-area-inset-top))]">
        <button
          onClick={() => history.back()}
          className="inline-flex min-w-0 items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={14} className="shrink-0" />
          <span className="truncate">{business.name}</span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {saving && <Spinner className="h-3.5 w-3.5 text-gray-400" />}
          <button
            onClick={() => setPreview(true)}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-900"
          >
            <Eye size={13} /> Preview
          </button>
          <Button size="sm" onClick={publish}>
            <Rocket size={13} /> {site.status === "live" ? "Re-publish" : "Mark live"}
          </Button>
        </div>
      </div>

      {/* preview canvas */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-3">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-chrome">
          <SiteTemplate
            templateId={site.template}
            theme={site.theme}
            motion={site.motion}
            content={site.contentJson}
            photos={site.photosJson}
            editable
            onContent={onContent}
          />
        </div>
        <p className="py-3 text-center text-[11px] text-gray-300">
          Click any text to edit it. Use + Add a service to grow the page.
        </p>
      </div>

      {/* controls */}
      <div className="border-t border-gray-200 bg-white">
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-gray-600"
        >
          Site controls
          <ChevronDown size={16} className={cn("transition", panelOpen && "rotate-180")} />
        </button>
        {panelOpen && (
          <div className="max-h-[46vh] space-y-4 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-1">
            {/* Ask for a change in plain words */}
            <div className="rounded-2xl bg-accent-wash/60 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-accent-deep">
                <Wand2 size={12} /> Ask for a change
              </p>
              <textarea
                value={refine}
                rows={2}
                placeholder="e.g. Mention the rooftop seating and that they cater weddings. Make it warmer."
                onChange={(e) => setRefine(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && refine.trim()) {
                    regenerate(refine.trim());
                  }
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none"
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => regenerate(refine.trim() || undefined)}
                  disabled={regen}
                >
                  {regen ? <Spinner /> : <Wand2 size={13} />}
                  {refine.trim() ? "Rewrite with this" : "Regenerate copy"}
                </Button>
                <span className="text-[10px] text-gray-400">
                  Notes are remembered for later rewrites.
                </span>
              </div>
              {site.brief && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] text-gray-400">
                    Brief so far
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-gray-500">
                    {site.brief}
                  </p>
                </details>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-medium text-gray-400">Template</p>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => patch({ template: t.id })}
                    className={cn(
                      "w-[104px] shrink-0 overflow-hidden rounded-xl border text-left",
                      site.template === t.id
                        ? "border-accent ring-1 ring-accent/40"
                        : "border-gray-200",
                    )}
                  >
                    <TemplateThumb template={t} theme={t.defaultTheme} compact />
                    <span className="block px-2 py-1 text-[11px] text-gray-700">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-medium text-gray-400">Theme</p>
              <div className="flex flex-wrap gap-2">
                {tpl.themes.map((th) => {
                  const pal = getThemePalette(th);
                  return (
                    <button
                      key={th}
                      onClick={() => patch({ theme: th })}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs capitalize",
                        site.theme === th
                          ? "border-accent text-gray-900"
                          : "border-gray-200 text-gray-600",
                      )}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          background: `linear-gradient(135deg, ${pal.accent}, ${pal.accent2})`,
                        }}
                      />
                      {th}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-medium text-gray-400">Motion</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MOTION_PRESETS.map((mp) => (
                  <button
                    key={mp.id}
                    onClick={() => patch({ motion: mp.id })}
                    className={cn(
                      "rounded-xl border px-2.5 py-2 text-left",
                      site.motion === mp.id
                        ? "border-accent bg-accent-wash/50"
                        : "border-gray-200 bg-white",
                    )}
                  >
                    <span className="block text-xs font-medium text-gray-900">{mp.name}</span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-gray-400">
                      {mp.blurb}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-gray-400">
                Every preset switches itself off for visitors who ask for reduced motion.
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-medium text-gray-400">WhatsApp button</p>
              <div className="space-y-2">
                <Input
                  defaultValue={site.contentJson.whatsapp ?? ""}
                  placeholder="Number with country code, e.g. 919876543210"
                  onBlur={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, "");
                    if (v !== (site.contentJson.whatsapp ?? "")) patch({ content: { whatsapp: v } });
                  }}
                />
                <textarea
                  defaultValue={site.contentJson.whatsappMessage ?? ""}
                  placeholder="Pre-filled message when they tap the button"
                  rows={2}
                  onBlur={(e) => {
                    if (e.target.value !== (site.contentJson.whatsappMessage ?? ""))
                      patch({ content: { whatsappMessage: e.target.value } });
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none"
                />
                {!site.contentJson.whatsapp && (
                  <p className="text-[10px] text-gray-400">
                    No number set — the WhatsApp button is hidden on the site.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-gray-400">
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
                <span className="mb-1 block text-[11px] font-medium text-gray-400">Status</span>
                <select
                  value={site.status}
                  onChange={(e) => patch({ status: e.target.value as SiteStatus })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent to client</option>
                  <option value="live">Live</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs">
              <div>
                <p className="text-gray-400">Suggested invoice</p>
                <p className="font-semibold text-gray-900">{formatINR(site.quotePrice)}</p>
              </div>
              <Button size="sm" variant="subtle" onClick={() => regenerate()} disabled={regen}>
                {regen ? <Spinner /> : <RefreshCw size={13} />} Regenerate copy
              </Button>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-medium text-gray-400">Photos</p>
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
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <Check size={14} className="shrink-0" />
                <span className="truncate">{shareUrl}</span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(shareUrl);
                    push("Link copied", "success");
                  }}
                  className="ml-auto shrink-0 rounded-full bg-emerald-50 p-1"
                >
                  <Copy size={12} />
                </button>
              </div>
            )}

            <button
              onClick={() => openDetail(leadId)}
              className="w-full rounded-xl border border-gray-200 py-2 text-xs text-gray-600 hover:text-gray-900"
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
              className="text-xs text-gray-400 hover:text-white"
            >
              {shareUrl}
            </a>
            <button
              onClick={() => setPreview(false)}
              className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-900"
            >
              Close preview
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
            <SiteTemplate
              templateId={site.template}
              theme={site.theme}
              motion={site.motion}
              content={site.contentJson}
              photos={site.photosJson}
            />
          </div>
        </div>
      )}
    </div>
  );
}
