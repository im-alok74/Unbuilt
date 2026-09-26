import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const REPO = process.env.GITHUB_REPO || "im-alok74/Unbuilt";
const LABEL = "from-dashboard";
const KIND_LABEL = { bug: "bug", idea: "enhancement", question: "question" } as const;
const KIND_PREFIX = { bug: "Bug", idea: "Idea", question: "Question" } as const;

function gh(path: string, init: RequestInit = {}) {
  return fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

/** Issues filed from the dashboard. Reps only see their own; managers and admins see all of them. */
export async function GET() {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ configured: false, issues: [] });

  const res = await gh(`/issues?labels=${LABEL}&state=all&per_page=40`);
  if (!res.ok) return NextResponse.json({ configured: true, error: "Couldn't load issues from GitHub.", issues: [] });
  const raw = (await res.json()) as {
    number: number;
    title: string;
    state: string;
    html_url: string;
    created_at: string;
    body: string | null;
    labels: { name: string }[];
    pull_request?: unknown;
  }[];

  const issues = raw
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      state: i.state as "open" | "closed",
      url: i.html_url,
      createdAt: i.created_at,
      kind: i.labels.some((l) => l.name === "bug") ? "bug" : i.labels.some((l) => l.name === "enhancement") ? "idea" : "question",
      reporter: /\*\*Reported by:\*\* ([^\n(]+)/.exec(i.body ?? "")?.[1]?.trim() ?? "",
      reporterId: /<!-- reporter:([0-9a-f-]+) -->/.exec(i.body ?? "")?.[1] ?? "",
    }))
    .filter((i) => s.role !== "rep" || i.reporterId === s.userId)
    .map(({ reporterId: _r, ...rest }) => rest);

  return NextResponse.json({ configured: true, issues });
}

const schema = z.object({
  kind: z.enum(["bug", "idea", "question"]),
  title: z.string().trim().min(5, "Give it a short title (5+ letters)").max(120),
  details: z.string().trim().min(5, "Tell us a little more").max(3000),
  page: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  if (!process.env.GITHUB_TOKEN) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = p.data;

  const body = [
    d.details,
    "",
    "---",
    `**Reported by:** ${s.name} (${s.role})`,
    `**Page:** ${d.page || "unknown"}`,
    `**Device:** ${req.headers.get("user-agent") ?? "unknown"}`,
    `**When:** ${new Date().toISOString()}`,
    "",
    "_Filed from the Unbuilt dashboard._",
    `<!-- reporter:${s.userId} -->`,
  ].join("\n");

  const res = await gh("/issues", {
    method: "POST",
    body: JSON.stringify({ title: `[${KIND_PREFIX[d.kind]}] ${d.title}`, body, labels: [LABEL, KIND_LABEL[d.kind]] }),
  });
  if (!res.ok) {
    console.error("[api/issues] GitHub", res.status, (await res.text().catch(() => "")).slice(0, 200));
    return NextResponse.json({ error: "GitHub refused the report. Ask the admin to check the GitHub token." }, { status: 502 });
  }
  const j = (await res.json()) as { number: number; html_url: string };
  return NextResponse.json({ number: j.number, url: j.html_url }, { status: 201 });
}
