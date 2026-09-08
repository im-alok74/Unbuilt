import "server-only";

// `gemini-flash-latest` gives the best copy but frequently 503s on the free
// tier; `gemini-flash-lite-latest` is reliable and good enough. Try the better
// one once, then fall back to lite with retries.
const CHAIN: { model: string; attempts: number }[] = [
  { model: "gemini-flash-latest", attempts: 1 },
  { model: "gemini-flash-lite-latest", attempts: 3 },
  { model: "gemini-3.6-flash", attempts: 2 },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callOnce(model: string, prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      cache: "no-store",
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err = new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
    (err as { status?: number }).status = res.status;
    throw err;
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

function parseJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Gemini returned non-JSON");
  }
}

export async function generateWithGemini(prompt: string, apiKey: string): Promise<unknown> {
  let lastErr: unknown;
  for (const { model, attempts } of CHAIN) {
    for (let i = 0; i < attempts; i++) {
      try {
        return parseJson(await callOnce(model, prompt, apiKey));
      } catch (e) {
        lastErr = e;
        const status = (e as { status?: number }).status;
        if ((status === 503 || status === 429 || status === 500) && i < attempts - 1) {
          await sleep(700 * (i + 1));
          continue;
        }
        break; // move to next model
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gemini failed");
}
