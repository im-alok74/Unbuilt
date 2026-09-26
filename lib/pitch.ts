import "server-only";
import { getConfig } from "@/lib/settings";
import { generateWithGemini } from "@/lib/llm/gemini";
import type { BusinessRow, Pitch } from "@/lib/types";

/** Mobile performance score (0-100) from Google's free PageSpeed API; null if unavailable. Costs no Places quota. */
async function pageSpeed(url: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&category=performance&url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(20_000), cache: "no-store" },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { lighthouseResult?: { categories?: { performance?: { score?: number } } } };
    const sc = j.lighthouseResult?.categories?.performance?.score;
    return typeof sc === "number" ? Math.round(sc * 100) : null;
  } catch {
    return null;
  }
}

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

/** Rule-based pitch: works with no API key and no quota, and is the fallback when Gemini fails. */
export function templatePitch(b: BusinessRow, min: number, max: number, speed: number | null = null): Pitch {
  const cat = (b.categoryLabel ?? b.category ?? "business").toLowerCase();
  const rep = b.rating ? `${b.rating}★ from ${b.reviewCount} reviews` : "a real customer following";
  const gap =
    b.websiteStatus === "none"
      ? "no website at all"
      : b.websiteStatus === "social"
        ? "only a social/listing page instead of a real website"
        : speed != null
          ? `a website that scores only ${speed}/100 on Google's mobile speed test`
          : "a website that could work harder";
  return {
    angle: `${b.name} has ${rep} on Google but ${gap}. People who search for a ${cat} nearby can't see prices, photos or a booking button beyond Maps — that's leaking customers to competitors.`,
    opening: `Hi, am I speaking with someone from ${b.name}? I found you on Google Maps — ${b.rating ? `${b.rating} stars is great — ` : ""}I noticed you don't have a proper website yet. I build simple one-page sites for local ${cat}s so new customers can find you, see your work and message you on WhatsApp. Do you have two minutes?`,
    objections: [
      { q: "It's too expensive", a: `Plans start at ${inr(min)}, one-time, and a single new customer usually covers it.` },
      { q: "I'm already on Instagram / JustDial", a: "Those are rented space. A website is yours, shows up on Google search, and works alongside them." },
      { q: "I don't know anything about websites", a: "You don't need to — we handle everything and you just approve it. I can send a free preview first." },
      { q: "Let me think about it", a: "Of course — can I send a sample on WhatsApp so you can see it before deciding?" },
    ],
    price: `${inr(min)} – ${inr(max)}`,
    source: "template",
  };
}

export async function generatePitch(b: BusinessRow): Promise<Pitch> {
  const cfg = await getConfig();
  const speed = b.websiteStatus === "real" && b.websiteRaw ? await pageSpeed(b.websiteRaw) : null;
  const base = templatePitch(b, cfg.defaultQuoteMin, cfg.defaultQuoteMax, speed);
  if (!cfg.llmApiKey || cfg.llmProvider !== "gemini") return base;
  const prompt = [
    "You are a sales coach for an Indian web-design agency. Write a phone pitch for a rep cold-calling a local business.",
    `Business: ${b.name}`,
    `Category: ${b.categoryLabel ?? b.category ?? "local business"}`,
    `Address: ${b.address ?? "unknown"}`,
    b.rating ? `Google rating: ${b.rating} from ${b.reviewCount} reviews` : "",
    `Website situation: ${b.websiteStatus === "none" ? "no website" : b.websiteStatus === "social" ? "only a social/listing page" : "has a website"}${speed != null ? ` (Google mobile speed score ${speed}/100 — use it as the reason to call)` : ""}`,
    `Quote range: ${inr(cfg.defaultQuoteMin)} to ${inr(cfg.defaultQuoteMax)}`,
    "Write plain, friendly, honest English (light Hinglish is fine). Do not invent facts about the business.",
    'Return JSON only: {"angle": string (1-2 sentences: why this business needs a site), "opening": string (what the rep says first, 2-3 sentences), "objections": [{"q": string, "a": string}] (exactly 4), "price": string}',
  ]
    .filter(Boolean)
    .join("\n");
  try {
    const j = (await generateWithGemini(prompt, cfg.llmApiKey)) as Partial<Pitch>;
    if (j.angle && j.opening && Array.isArray(j.objections) && j.objections.length) {
      return {
        angle: String(j.angle),
        opening: String(j.opening),
        objections: j.objections.slice(0, 5).map((o) => ({ q: String(o.q), a: String(o.a) })),
        price: String(j.price ?? base.price),
        source: "ai",
      };
    }
  } catch {
    /* fall through to the template pitch */
  }
  return base;
}
