"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Download, Gauge, Tags, IndianRupee, SlidersHorizontal } from "lucide-react";
import useSWR from "swr";
import { fetcher, useConfig } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { Button, Field, Input, Select, Spinner } from "@/components/ui/primitives";
import { humanizeType } from "@/lib/utils";
import { DEFAULT_SCORING_WEIGHTS, type ScoringWeights } from "@/lib/types";

interface SettingsData {
  llmProvider: string;
  priorityCategories: string[];
  scoringWeights: ScoringWeights;
  defaultQuoteMin: number;
  defaultQuoteMax: number;
  placesApiKeyMask: string | null;
  llmApiKeyMask: string | null;
  mapboxTokenSet: boolean;
  mapboxToken: string;
  pinSet: boolean;
  envOverrides: { places: boolean; llm: boolean; mapbox: boolean; pin: boolean };
}

const WEIGHT_LABELS: Record<keyof ScoringWeights, string> = {
  noWebsite: "No website",
  socialOnly: "Social / placeholder only",
  fewPhotos: "Fewer than 5 photos",
  underMarketed: "Under-marketed (4.0★, <20 reviews)",
  priorityCategory: "In priority category list",
};

export function YouScreen() {
  const { data, mutate, isLoading } = useSWR<SettingsData>("/api/settings", fetcher);
  const { data: quota } = useSWR<{ used: number; cap: number; pct: number; live: boolean; note: string }>(
    "/api/quota",
    fetcher,
  );
  const { refresh: refreshConfig } = useConfig();
  const { push } = useToast();
  const router = useRouter();

  const [placesKey, setPlacesKey] = React.useState("");
  const [llmKey, setLlmKey] = React.useState("");
  const [llmProvider, setLlmProvider] = React.useState("gemini");
  const [mapbox, setMapbox] = React.useState("");
  const [weights, setWeights] = React.useState<ScoringWeights>(DEFAULT_SCORING_WEIGHTS);
  const [cats, setCats] = React.useState<string[]>([]);
  const [catInput, setCatInput] = React.useState("");
  const [qMin, setQMin] = React.useState(2000);
  const [qMax, setQMax] = React.useState(3000);
  const [newPin, setNewPin] = React.useState("");
  const [saving, setSaving] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!data) return;
    setLlmProvider(data.llmProvider);
    setWeights({ ...DEFAULT_SCORING_WEIGHTS, ...data.scoringWeights });
    setCats(data.priorityCategories);
    setQMin(data.defaultQuoteMin);
    setQMax(data.defaultQuoteMax);
    setMapbox(data.mapboxToken || "");
  }, [data]);

  async function save(patch: Record<string, unknown>, label: string) {
    setSaving(label);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error ? JSON.stringify(d.error) : "save failed");
      }
      push(`${label} saved`, "success");
      mutate();
      refreshConfig();
      return true;
    } catch (e) {
      push(e instanceof Error ? e.message : "Save failed", "error");
      return false;
    } finally {
      setSaving(null);
    }
  }

  async function lock() {
    await fetch("/api/lock", { method: "POST" });
    router.push("/unlock");
  }

  if (isLoading || !data) {
    return (
      <div className="grid min-h-[100dvh] place-items-center text-white/40">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] px-3 pb-28 pt-[max(14px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-lg space-y-5">
        <header>
          <h1 className="text-xl font-semibold text-white">You</h1>
          <p className="text-xs text-white/45">Keys, scoring, and app settings.</p>
        </header>

        {/* API keys */}
        <Section icon={KeyRound} title="API keys">
          <Field
            label="Google Places API (New) key"
            hint={
              data.envOverrides.places
                ? "Currently set via environment variable (overrides this field)."
                : data.placesApiKeyMask
                  ? `Saved: ${data.placesApiKeyMask}`
                  : "Not set — the app runs on demo data until you add this."
            }
          >
            <div className="flex gap-2">
              <Input
                type="password"
                value={placesKey}
                onChange={(e) => setPlacesKey(e.target.value)}
                placeholder="AIza…"
              />
              <Button
                size="sm"
                variant="subtle"
                disabled={saving !== null}
                onClick={async () => {
                  if (await save({ placesApiKey: placesKey }, "Places key")) setPlacesKey("");
                }}
              >
                Save
              </Button>
            </div>
          </Field>

          <Field label="Copy generator">
            <Select value={llmProvider} onChange={(e) => setLlmProvider(e.target.value)}>
              <option value="gemini">Google Gemini (free tier)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </Select>
          </Field>
          <Field
            label="LLM API key"
            hint={
              data.envOverrides.llm
                ? "Currently set via environment variable."
                : data.llmApiKeyMask
                  ? `Saved: ${data.llmApiKeyMask}`
                  : "Not set — Build uses templated copy until you add this."
            }
          >
            <div className="flex gap-2">
              <Input
                type="password"
                value={llmKey}
                onChange={(e) => setLlmKey(e.target.value)}
                placeholder="API key"
              />
              <Button
                size="sm"
                variant="subtle"
                disabled={saving !== null}
                onClick={async () => {
                  if (await save({ llmApiKey: llmKey, llmProvider }, "LLM key")) setLlmKey("");
                }}
              >
                Save
              </Button>
            </div>
          </Field>

          <Field
            label="Mapbox public token"
            hint={
              data.envOverrides.mapbox
                ? "Currently set via environment variable."
                : data.mapboxTokenSet
                  ? "Saved. The real 3D map is enabled."
                  : "Not set — the map shows a schematic fallback."
            }
          >
            <div className="flex gap-2">
              <Input value={mapbox} onChange={(e) => setMapbox(e.target.value)} placeholder="pk.…" />
              <Button
                size="sm"
                variant="subtle"
                disabled={saving !== null}
                onClick={() => save({ mapboxToken: mapbox }, "Mapbox token")}
              >
                Save
              </Button>
            </div>
          </Field>
        </Section>

        {/* Quota */}
        <Section icon={Gauge} title="Places API usage this month">
          {quota ? (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full ${quota.pct >= 90 ? "bg-red-400" : quota.pct >= 60 ? "bg-accent" : "bg-emerald-400"}`}
                  style={{ width: `${Math.min(100, quota.pct)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-white/55">
                {quota.live
                  ? `${quota.used} / ~${quota.cap} free calls used`
                  : "Demo mode — no live calls yet"}
              </p>
              <p className="text-[10px] text-white/30">{quota.note}</p>
            </>
          ) : (
            <p className="text-xs text-white/40">Loading…</p>
          )}
        </Section>

        {/* Scoring weights */}
        <Section icon={SlidersHorizontal} title="Scoring weights">
          {(Object.keys(WEIGHT_LABELS) as (keyof ScoringWeights)[]).map((k) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/70">{WEIGHT_LABELS[k]}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={weights[k]}
                onChange={(e) => setWeights((w) => ({ ...w, [k]: Number(e.target.value) }))}
                className="w-16 rounded-lg border border-white/12 bg-ink-900 px-2 py-1 text-right text-sm text-white"
              />
            </div>
          ))}
          <Button
            size="sm"
            variant="subtle"
            className="mt-1"
            disabled={saving !== null}
            onClick={() => save({ scoringWeights: weights }, "Scoring weights")}
          >
            Save weights
          </Button>
        </Section>

        {/* Priority categories */}
        <Section icon={Tags} title="Priority categories">
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs text-white/80"
              >
                {humanizeType(c)}
                <button
                  onClick={() => setCats((x) => x.filter((y) => y !== c))}
                  className="text-white/40 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={catInput}
              onChange={(e) => setCatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && catInput.trim()) {
                  setCats((x) => [...new Set([...x, catInput.trim().toLowerCase().replace(/\s+/g, "_")])]);
                  setCatInput("");
                }
              }}
              placeholder="Add a Places type, e.g. hardware_store"
              className="text-xs"
            />
            <Button
              size="sm"
              variant="subtle"
              disabled={saving !== null}
              onClick={() => save({ priorityCategories: cats }, "Priority categories")}
            >
              Save
            </Button>
          </div>
          <p className="text-[10px] text-white/30">
            Use Google Places type IDs (snake_case). These also become the default scan filter.
          </p>
        </Section>

        {/* Quote range */}
        <Section icon={IndianRupee} title="Default quote range">
          <div className="flex items-center gap-2">
            <Input type="number" value={qMin} onChange={(e) => setQMin(Number(e.target.value))} />
            <span className="text-white/40">to</span>
            <Input type="number" value={qMax} onChange={(e) => setQMax(Number(e.target.value))} />
            <Button
              size="sm"
              variant="subtle"
              disabled={saving !== null}
              onClick={() => save({ defaultQuoteMin: qMin, defaultQuoteMax: qMax }, "Quote range")}
            >
              Save
            </Button>
          </div>
          <p className="text-[10px] text-white/30">
            New sites default to the midpoint. You invoice clients yourself — no payments here.
          </p>
        </Section>

        {/* PIN */}
        <Section icon={Lock} title="App lock">
          <Field label="Change PIN" hint="4–8 digits.">
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="New PIN"
              />
              <Button
                size="sm"
                variant="subtle"
                disabled={saving !== null || !/^\d{4,8}$/.test(newPin)}
                onClick={async () => {
                  if (await save({ newPin }, "PIN")) setNewPin("");
                }}
              >
                Update
              </Button>
            </div>
          </Field>
          <Button variant="outline" size="sm" onClick={lock}>
            <Lock size={13} /> Lock app now
          </Button>
        </Section>

        {/* Export */}
        <Section icon={Download} title="Export">
          <Button
            variant="subtle"
            size="sm"
            onClick={() => (window.location.href = "/api/export")}
          >
            <Download size={13} /> Download all leads (CSV)
          </Button>
        </Section>

        <p className="pb-4 text-center text-[10px] text-white/25">Unbuilt · personal use</p>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="chrome space-y-3 rounded-2xl p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Icon size={15} className="text-accent" />
        {title}
      </h2>
      {children}
    </section>
  );
}
