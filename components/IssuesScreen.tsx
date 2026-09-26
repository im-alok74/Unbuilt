"use client";

import * as React from "react";
import useSWR from "swr";
import { Bug, Lightbulb, HelpCircle, ExternalLink } from "lucide-react";
import { fetcher, useMe } from "@/lib/hooks";
import { Badge, Button, Field, Input, Spinner, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { timeAgo, cn } from "@/lib/utils";

interface Issue {
  number: number;
  title: string;
  state: "open" | "closed";
  url: string;
  createdAt: string;
  kind: "bug" | "idea" | "question";
  reporter: string;
}

const KINDS = [
  { id: "bug", label: "Something is broken", icon: Bug },
  { id: "idea", label: "I have an idea", icon: Lightbulb },
  { id: "question", label: "I have a question", icon: HelpCircle },
] as const;

export function IssuesScreen() {
  const { push } = useToast();
  const me = useMe();
  const { data, isLoading, mutate } = useSWR<{ configured: boolean; error?: string; issues: Issue[] }>("/api/issues", fetcher, { revalidateOnFocus: false });
  const [kind, setKind] = React.useState<(typeof KINDS)[number]["id"]>("bug");
  const [title, setTitle] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const isStaff = me && me.role !== "rep";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, title, details, page: document.referrer && new URL(document.referrer).origin === location.origin ? new URL(document.referrer).pathname : location.pathname }),
    }).catch(() => null);
    const d = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return push(d?.error === "not_configured" ? "Issue reporting isn't connected yet. Tell the admin." : (d?.error ?? "Couldn't send. Try again."), "error");
    push(`Sent. Thank you! Reference #${d.number}`, "success");
    setTitle("");
    setDetails("");
    mutate();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pb-32 pt-[max(20px,env(safe-area-inset-top))]">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Report a problem</h1>
        <p className="text-xs text-gray-500">Tell us what went wrong or what you wish the app did. It goes straight to the tech team.</p>
      </header>

      {data && !data.configured ? (
        <div className="card space-y-2 rounded-2xl p-4 text-sm shadow-card">
          <p className="font-semibold text-gray-900">Issue reporting isn&apos;t connected yet</p>
          {me?.role === "admin" ? (
            <ol className="list-decimal space-y-1 pl-5 text-xs text-gray-600">
              <li>On GitHub, open Settings → Developer settings → Personal access tokens → Fine-grained tokens.</li>
              <li>Create a token for the Unbuilt repository with <b>Issues: Read and write</b>.</li>
              <li>In Vercel, add it as an environment variable named <b>GITHUB_TOKEN</b> and redeploy.</li>
            </ol>
          ) : (
            <p className="text-xs text-gray-500">Please tell the admin, or message them on WhatsApp for now.</p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-3 rounded-2xl p-4 shadow-card">
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map((k) => (
              <button
                type="button"
                key={k.id}
                onClick={() => setKind(k.id)}
                className={cn("flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center text-[11px] font-medium", kind === k.id ? "border-accent bg-accent-wash text-accent-deep" : "border-gray-200 text-gray-600")}
              >
                <k.icon size={18} />
                {k.label}
              </button>
            ))}
          </div>
          <Field label="In a few words">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "bug" ? "e.g. WhatsApp button does nothing" : kind === "idea" ? "e.g. Add Hindi language" : "e.g. How do I change my password?"} />
          </Field>
          <Field label="Tell us more" hint="What did you tap, and what did you expect to happen? We attach your name, the page and your phone type automatically.">
            <Textarea rows={5} value={details} onChange={(e) => setDetails(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={busy || title.trim().length < 5 || details.trim().length < 5}>
            {busy ? <Spinner /> : "Send to the tech team"}
          </Button>
        </form>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">{isStaff ? "Everything reported" : "Your reports"}</h2>
        {isLoading && <Spinner className="mx-auto text-gray-300" />}
        {data?.error && <p className="text-xs text-red-600">{data.error}</p>}
        {data?.issues.map((i) => (
          <a key={i.number} href={isStaff ? i.url : undefined} target="_blank" rel="noreferrer" className="card flex items-center gap-3 rounded-2xl p-3.5 shadow-card">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900">{i.title}</span>
              <span className="block text-[11px] text-gray-400">
                #{i.number} · {isStaff && i.reporter ? `${i.reporter} · ` : ""}
                {timeAgo(i.createdAt)}
              </span>
            </span>
            <Badge tone={i.state === "open" ? "orange" : "green"}>{i.state === "open" ? "Being looked at" : "Fixed"}</Badge>
            {isStaff && <ExternalLink size={13} className="text-gray-300" />}
          </a>
        ))}
        {data?.configured && data.issues.length === 0 && <p className="py-6 text-center text-xs text-gray-400">Nothing reported yet.</p>}
      </section>
    </div>
  );
}
