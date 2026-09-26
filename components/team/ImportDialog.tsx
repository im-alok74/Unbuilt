"use client";

import * as React from "react";
import { X, Upload, FileSpreadsheet } from "lucide-react";
import { Button, Select, Spinner } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Field = "name" | "phone" | "category" | "address" | "website" | "notes";
const FIELDS: { key: Field; label: string; hints: string[] }[] = [
  { key: "name", label: "Business name", hints: ["name", "business", "company", "shop", "firm", "title"] },
  { key: "phone", label: "Phone", hints: ["phone", "mobile", "contact", "number", "whatsapp", "cell"] },
  { key: "category", label: "Category", hints: ["category", "type", "niche", "industry", "segment"] },
  { key: "address", label: "Address", hints: ["address", "location", "area", "city", "locality"] },
  { key: "website", label: "Website", hints: ["website", "site", "url", "web"] },
  { key: "notes", label: "Notes", hints: ["note", "remark", "comment", "detail"] },
];

const guess = (headers: string[], f: (typeof FIELDS)[number]) =>
  headers.findIndex((h) => f.hints.some((x) => h.toLowerCase().includes(x)));

/** Minimal RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

export function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (ids: string[]) => void }) {
  const { push } = useToast();
  const [file, setFile] = React.useState("");
  const [grid, setGrid] = React.useState<string[][]>([]);
  const [map, setMap] = React.useState<Record<Field, number>>({ name: -1, phone: -1, category: -1, address: -1, website: -1, notes: -1 });
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState(false);

  async function load(f: File) {
    try {
      let rows: string[][];
      if (/\.csv$/i.test(f.name)) rows = parseCsv(await f.text());
      else {
        const { readSheet } = await import("read-excel-file/browser");
        rows = (await readSheet(f)).map((r) => r.map((c) => (c == null ? "" : String(c))));
      }
      rows = rows.filter((r) => r.some((c) => c.trim()));
      if (rows.length < 2) throw new Error("empty");
      const headers = rows[0];
      setGrid(rows);
      setFile(f.name);
      const m = {} as Record<Field, number>;
      FIELDS.forEach((fl) => (m[fl.key] = guess(headers, fl)));
      setMap(m);
    } catch {
      push("Couldn't read that file. Use .xlsx or .csv with a header row.", "error");
    }
  }

  const headers = grid[0] ?? [];
  const body = grid.slice(1);
  const preview = body.slice(0, 5);
  const pick = (r: string[], k: Field) => (map[k] >= 0 ? (r[map[k]] ?? "").trim() : "");

  async function submit() {
    setBusy(true);
    const rows = body
      .map((r) => ({
        name: pick(r, "name"),
        phone: pick(r, "phone") || undefined,
        category: pick(r, "category") || undefined,
        address: pick(r, "address") || undefined,
        website: pick(r, "website") || undefined,
        notes: pick(r, "notes") || undefined,
      }))
      .filter((r) => r.name);
    let ids: string[] = [];
    let imported = 0;
    const skipped = { duplicate: 0, dnc: 0 };
    try {
      for (let i = 0; i < rows.length; i += 500) {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: rows.slice(i, i + 500) }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d?.error ?? "Import failed");
        ids = ids.concat(d.businessIds);
        imported += d.imported;
        skipped.duplicate += d.skipped.duplicate;
        skipped.dnc += d.skipped.dnc;
      }
      push(`Imported ${imported} leads${skipped.duplicate ? ` · ${skipped.duplicate} duplicates skipped` : ""}${skipped.dnc ? ` · ${skipped.dnc} do-not-contact skipped` : ""}`, "success");
      setGrid([]);
      setFile("");
      onDone(ids);
      onClose();
    } catch (e) {
      push(e instanceof Error ? e.message : "Import failed", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] grid place-items-end bg-black/50 sm:place-items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-chrome sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <FileSpreadsheet size={18} className="text-accent" /> Import leads
          </h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {!grid.length ? (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) load(f);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center",
              drag ? "border-accent bg-accent-wash" : "border-gray-200",
            )}
          >
            <Upload size={26} className="text-gray-400" />
            <p className="text-sm font-medium text-gray-700">Drop an Excel or CSV file, or tap to choose</p>
            <p className="text-xs text-gray-400">First row = column names. Nothing is uploaded until you confirm.</p>
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
          </label>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              <b className="text-gray-800">{file}</b> · {body.length} rows. Check the columns matched correctly.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <label key={f.key} className="space-y-1">
                  <span className="text-xs font-medium text-gray-600">
                    {f.label}
                    {f.key === "name" && " *"}
                  </span>
                  <Select value={map[f.key]} onChange={(e) => setMap((m) => ({ ...m, [f.key]: Number(e.target.value) }))}>
                    <option value={-1}>— none —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-left text-gray-400">
                  <tr>
                    {FIELDS.map((f) => (
                      <th key={f.key} className="px-3 py-2 font-medium">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {FIELDS.map((f) => (
                        <td key={f.key} className="max-w-[140px] truncate px-3 py-1.5 text-gray-700">
                          {pick(r, f.key) || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-400">
              Rows with a phone number already in the system, and numbers on the do-not-contact list, are skipped. Costs no Google API calls.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setGrid([])}>
                Choose another
              </Button>
              <Button disabled={busy || map.name < 0} onClick={submit}>
                {busy ? <Spinner /> : `Import ${body.length} leads`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
