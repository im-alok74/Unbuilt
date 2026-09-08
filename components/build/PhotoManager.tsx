"use client";

import * as React from "react";
import { Star, Trash2, Plus } from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import type { SitePhoto, BusinessRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PhotoManager({
  photos,
  business,
  onChange,
}: {
  photos: SitePhoto[];
  business: BusinessRow | null;
  onChange: (p: SitePhoto[]) => void;
}) {
  const [url, setUrl] = React.useState("");
  const usedUrls = new Set(photos.map((p) => p.url));
  const available = (business?.photos ?? [])
    .filter((p) => p.uri && !usedUrls.has(p.uri))
    .map((p) => p.uri!) as string[];

  function makeHero(i: number) {
    const next = [...photos];
    const [item] = next.splice(i, 1);
    onChange([item, ...next]);
  }
  function remove(i: number) {
    onChange(photos.filter((_, j) => j !== i));
  }
  function addUrl() {
    const u = url.trim();
    if (!/^https?:\/\//.test(u)) return;
    onChange([...photos, { url: u, alt: business?.name ?? "", source: "upload" }]);
    setUrl("");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={p.url} className="group relative overflow-hidden rounded-lg border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-20 w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => makeHero(i)}
                className={cn("rounded-full p-1.5", i === 0 ? "bg-accent text-white" : "bg-white/25 text-white")}
                title="Use as main photo"
              >
                <Star size={13} />
              </button>
              <button
                onClick={() => remove(i)}
                className="rounded-full bg-white/25 p-1.5 text-white"
                title="Remove"
              >
                <Trash2 size={13} />
              </button>
            </div>
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-accent px-1 text-[9px] font-bold text-white">
                MAIN
              </span>
            )}
          </div>
        ))}
      </div>

      {available.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-gray-400">From the Google listing</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {available.slice(0, 12).map((u) => (
              <button
                key={u}
                onClick={() => onChange([...photos, { url: u, alt: business?.name ?? "", source: "places" }])}
                className="relative shrink-0 overflow-hidden rounded-lg border border-gray-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-16 w-24 object-cover" />
                <span className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-gray-900">
                  <Plus size={11} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste an image URL…"
          className="text-xs"
        />
        <Button size="sm" variant="subtle" onClick={addUrl}>
          Add
        </Button>
      </div>
      <p className="text-[10px] text-gray-300">
        Direct file upload needs blob storage — add via URL for now, or pick from the Google listing.
      </p>
    </div>
  );
}
