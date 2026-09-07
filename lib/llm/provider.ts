import "server-only";
import { getConfig } from "@/lib/settings";
import type { BusinessRow, SiteService } from "@/lib/types";
import { generateWithGemini } from "./gemini";
import { generateMockCopy } from "./mock";

export interface GeneratedCopy {
  tagline: string;
  heroHeadline: string;
  heroSub: string;
  ctaLabel: string;
  aboutTitle: string;
  aboutBody: string;
  services: SiteService[];
  footerNote: string;
  _provider: "gemini" | "mock" | "openai" | "anthropic";
}

export interface CopyContext {
  business: BusinessRow;
  templateName: string;
  tone?: string;
}

export function buildPrompt(ctx: CopyContext): string {
  const b = ctx.business;
  return [
    `You are writing website copy for a small local business that a freelance web designer is pitching a one-page site to.`,
    `Business name: ${b.name}`,
    `Category: ${b.categoryLabel ?? b.category ?? "local business"}`,
    `City/address: ${b.address ?? "a local neighbourhood"}`,
    b.rating ? `Google rating: ${b.rating} from ${b.reviewCount} reviews` : ``,
    b.hours?.weekdayDescriptions?.length
      ? `Hours: ${b.hours.weekdayDescriptions.join("; ")}`
      : ``,
    `Template style: ${ctx.templateName}`,
    `Tone: ${ctx.tone ?? "warm, confident, plain-spoken; no hype, no exclamation-mark spam"}`,
    ``,
    `Write JSON only, matching exactly this TypeScript type:`,
    `{`,
    `  "tagline": string,            // 3-6 words, sits under the business name`,
    `  "heroHeadline": string,       // 5-10 words, the main promise`,
    `  "heroSub": string,            // 1-2 sentences`,
    `  "ctaLabel": string,           // 2-4 words, e.g. "Book a table"`,
    `  "aboutTitle": string,         // 2-4 words`,
    `  "aboutBody": string,          // 2-3 sentences about the business`,
    `  "services": [{ "title": string, "body": string }],  // 3-4 items, body = 1 sentence`,
    `  "footerNote": string          // 1 short line, e.g. "Family-run since 2012"`,
    `}`,
    `Do not invent specific facts (years, awards, staff names, prices). Keep it believable for a business you know little about. Output raw JSON, no markdown fences.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function coerceCopy(
  raw: unknown,
  fallback: GeneratedCopy,
): GeneratedCopy {
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  const services = Array.isArray(r.services)
    ? (r.services as unknown[])
        .map((s) => {
          const o = (s ?? {}) as Record<string, unknown>;
          return {
            title: String(o.title ?? "").slice(0, 80),
            body: String(o.body ?? "").slice(0, 240),
          };
        })
        .filter((s) => s.title)
        .slice(0, 5)
    : fallback.services;
  const str = (v: unknown, fb: string, max = 300) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fb;
  return {
    tagline: str(r.tagline, fallback.tagline, 60),
    heroHeadline: str(r.heroHeadline, fallback.heroHeadline, 120),
    heroSub: str(r.heroSub, fallback.heroSub, 300),
    ctaLabel: str(r.ctaLabel, fallback.ctaLabel, 30),
    aboutTitle: str(r.aboutTitle, fallback.aboutTitle, 40),
    aboutBody: str(r.aboutBody, fallback.aboutBody, 600),
    services: services.length ? services : fallback.services,
    footerNote: str(r.footerNote, fallback.footerNote, 120),
    _provider: fallback._provider,
  };
}

export async function generateSiteCopy(ctx: CopyContext): Promise<GeneratedCopy> {
  const cfg = await getConfig();
  const fallback = generateMockCopy(ctx);

  if (cfg.hasLlmKey && cfg.llmProvider === "gemini") {
    try {
      const raw = await generateWithGemini(buildPrompt(ctx), cfg.llmApiKey!);
      return coerceCopy(raw, { ...fallback, _provider: "gemini" });
    } catch (err) {
      console.error("[llm] gemini failed, using mock copy", err);
      return fallback;
    }
  }

  return fallback;
}
