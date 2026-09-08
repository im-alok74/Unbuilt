"use client";

import * as React from "react";
import {
  getTemplate,
  getThemePalette,
  FONT_STACKS,
  type SectionId,
  type ThemePalette,
  type TemplateConfig,
} from "@/lib/templates";
import { resolvePhotoUrl } from "@/lib/photos";
import { whatsappLink } from "@/lib/whatsapp";
import type { SiteContent, SitePhoto } from "@/lib/types";
import { EditableText } from "./EditableText";

interface Props {
  templateId: string;
  theme: string;
  content: SiteContent;
  photos: SitePhoto[];
  editable?: boolean;
  onContent?: (patch: Partial<SiteContent>) => void;
}

const WA_ICON =
  "M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.8 14.3c-.25.7-1.45 1.35-2 1.4-.5.05-1.15.07-1.85-.12a10 10 0 0 1-1.7-.6 12.6 12.6 0 0 1-4.9-4.35c-.36-.5-.9-1.4-.9-2.66 0-1.27.66-1.9.9-2.16.24-.26.53-.32.7-.32h.5c.16 0 .38-.06.6.45l.8 1.95c.06.13.1.29.02.45-.1.2-.15.32-.3.5l-.44.5c-.14.15-.29.3-.12.6.16.3.72 1.2 1.55 1.94 1.06.95 1.96 1.24 2.24 1.38.28.15.44.12.6-.07.16-.2.7-.8.88-1.08.19-.28.37-.23.62-.14.25.1 1.6.75 1.87.9.28.13.46.2.53.3.06.13.06.7-.19 1.4Z";

export function SiteTemplate({
  templateId,
  theme,
  content: c,
  photos,
  editable = false,
  onContent,
}: Props) {
  const t = getTemplate(templateId);
  const p = getThemePalette(theme);
  const font = FONT_STACKS[t.font];
  const set = (patch: Partial<SiteContent>) => onContent?.(patch);
  const R = t.radius;

  const gallery = (photos ?? [])
    .map((ph) => ({ ...ph, url: resolvePhotoUrl(ph.url, 1200) }))
    .filter((ph) => ph.url);
  const hero = gallery[0]?.url;
  const waHref = c.whatsapp ? whatsappLink(c.whatsapp, c.whatsappMessage) : "";

  const nav = t.sections.filter((s) =>
    (["about", "services", "gallery", "hours", "contact"] as SectionId[]).includes(s),
  );

  const eyebrow: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: t.uppercaseEyebrow ? "0.16em" : "0.02em",
    textTransform: t.uppercaseEyebrow ? "uppercase" : "none",
    color: p.accent,
  };
  const btn = (variant: "solid" | "ghost" | "wa" = "solid"): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "13px 24px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 15,
    textDecoration: "none",
    cursor: "pointer",
    border: variant === "ghost" ? `1.5px solid ${p.accent}` : "none",
    background:
      variant === "solid" ? p.accent : variant === "wa" ? "#25D366" : "transparent",
    color: variant === "ghost" ? p.accent : "#fff",
  });
  const section = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: "clamp(48px, 8vw, 88px) 0",
    ...extra,
  });
  const container: React.CSSProperties = { width: "100%", maxWidth: 1080, margin: "0 auto", padding: "0 22px" };
  const card = (): React.CSSProperties => {
    const base: React.CSSProperties = { borderRadius: Math.max(R - 4, 4), padding: 22 };
    if (t.cards === "bordered") return { ...base, border: `1px solid ${p.border}`, background: p.bg };
    if (t.cards === "elevated")
      return { ...base, background: p.bg, boxShadow: "0 10px 30px rgba(0,0,0,0.08)", border: `1px solid ${p.border}` };
    if (t.cards === "flat") return { ...base, background: p.surface };
    return { ...base, background: p.surface, border: `1px solid ${p.border}` };
  };

  // ── sections ───────────────────────────────────────────────────────────────
  const S: Record<SectionId, React.ReactNode> = {
    hero: <Hero />,
    highlights: c.highlights?.length ? (
      <section style={section({ paddingTop: 0 })}>
        <div style={container}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(c.highlights.length, 3)}, 1fr)`,
              gap: 1,
              background: p.border,
              border: `1px solid ${p.border}`,
              borderRadius: R,
              overflow: "hidden",
            }}
          >
            {c.highlights.slice(0, 3).map((h, i) => (
              <div key={i} style={{ background: p.bg, padding: "22px 18px", textAlign: "center" }}>
                <div style={{ fontFamily: font.heading, fontSize: 24, fontWeight: 700, color: p.text }}>
                  {h.value}
                </div>
                <div style={{ fontSize: 12.5, color: p.muted, marginTop: 4 }}>{h.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ) : null,
    services: c.services?.length ? (
      <section id="services" style={section()}>
        <div style={container}>
          <p style={eyebrow}>What we offer</p>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            }}
          >
            {c.services.map((s, i) => (
              <div key={i} style={card()}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: p.accent,
                    opacity: 0.14,
                    marginBottom: 12,
                  }}
                />
                <EditableText
                  as="h3"
                  editable={editable}
                  value={s.title}
                  onChange={(v) =>
                    set({ services: c.services.map((x, j) => (j === i ? { ...x, title: v } : x)) })
                  }
                />
                <div style={{ height: 6 }} />
                <EditableText
                  as="p"
                  editable={editable}
                  multiline
                  value={s.body}
                  onChange={(v) =>
                    set({ services: c.services.map((x, j) => (j === i ? { ...x, body: v } : x)) })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    ) : null,
    about: (
      <section id="about" style={section({ background: p.surface })}>
        <div style={{ ...container, maxWidth: 760 }}>
          <p style={eyebrow}>About</p>
          <div style={{ height: 10 }} />
          <EditableText as="h2" editable={editable} value={c.aboutTitle} onChange={(v) => set({ aboutTitle: v })} />
          <div style={{ height: 12 }} />
          <EditableText
            as="p"
            editable={editable}
            multiline
            value={c.aboutBody}
            onChange={(v) => set({ aboutBody: v })}
          />
        </div>
      </section>
    ),
    gallery:
      gallery.length > 1 ? (
        <section id="gallery" style={section()}>
          <div style={container}>
            <p style={eyebrow}>Gallery</p>
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
              }}
            >
              {gallery.slice(0, 9).map((ph, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={ph.url}
                  alt={ph.alt || c.businessName}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: 210,
                    objectFit: "cover",
                    borderRadius: Math.max(R - 6, 4),
                    border: `1px solid ${p.border}`,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null,
    hours:
      c.hours?.length > 0 ? (
        <section id="hours" style={section({ background: p.surface })}>
          <div style={{ ...container, maxWidth: 560 }}>
            <EditableText as="h2" editable={editable} value={c.hoursTitle} onChange={(v) => set({ hoursTitle: v })} />
            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}>
              {c.hours.map((h, i) => {
                const [day, ...rest] = h.split(":");
                return (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: `1px solid ${p.border}`,
                      fontSize: 14.5,
                      color: p.muted,
                    }}
                  >
                    <span style={{ color: p.text, fontWeight: 500 }}>{day}</span>
                    <span>{rest.join(":").trim()}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null,
    contact: (
      <section id="contact" style={{ ...section(), background: p.band, color: p.bandText }}>
        <div style={{ ...container, maxWidth: 720, textAlign: "center" }}>
          <p style={{ ...eyebrow, color: p.accent }}>Get in touch</p>
          <div style={{ height: 12 }} />
          <h2 style={{ fontFamily: font.heading, fontSize: "clamp(24px,4vw,34px)", fontWeight: 700, margin: 0 }}>
            {c.businessName}
          </h2>
          <div style={{ height: 14 }} />
          <p style={{ fontSize: 15.5, lineHeight: 1.8, opacity: 0.9, margin: 0 }}>
            {c.address}
            {c.address && c.phone ? <br /> : null}
            {c.phone && (
              <a href={`tel:${c.phone}`} style={{ color: p.bandText, textDecoration: "underline" }}>
                {c.phone}
              </a>
            )}
          </p>
          <div
            style={{
              height: 22,
            }}
          />
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer" style={btn("wa")}>
                <Wa /> Message on WhatsApp
              </a>
            )}
            {c.mapLink && (
              <a href={c.mapLink} target="_blank" rel="noreferrer" style={btn("solid")}>
                Get directions
              </a>
            )}
            {c.phone && (
              <a href={`tel:${c.phone}`} style={{ ...btn("ghost"), borderColor: p.bandText, color: p.bandText }}>
                Call now
              </a>
            )}
          </div>
        </div>
      </section>
    ),
  };

  function Hero() {
    const onImg = t.hero === "image";
    const eyebrowEl = (
      <EditableText
        as="p"
        editable={editable}
        value={c.tagline}
        onChange={(v) => set({ tagline: v })}
        style={{ ...eyebrow, color: onImg ? "rgba(255,255,255,0.85)" : p.accent }}
      />
    );
    const h1 = (
      <EditableText as="h1" editable={editable} value={c.heroHeadline} onChange={(v) => set({ heroHeadline: v })} />
    );
    const sub = (
      <EditableText as="p" editable={editable} multiline value={c.heroSub} onChange={(v) => set({ heroSub: v })} />
    );
    const ctas = (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
        <a href="#contact" style={btn("solid")}>
          <EditableText editable={editable} value={c.ctaLabel} onChange={(v) => set({ ctaLabel: v })} />
        </a>
        {waHref && (
          <a href={waHref} target="_blank" rel="noreferrer" style={btn("wa")}>
            <Wa /> WhatsApp
          </a>
        )}
      </div>
    );

    if (t.hero === "image") {
      return (
        <header
          style={{
            position: "relative",
            minHeight: "min(78vh, 620px)",
            display: "flex",
            alignItems: "flex-end",
            color: "#fff",
            background: hero
              ? `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.72)), url(${hero}) center/cover`
              : p.band,
          }}
        >
          <div style={{ ...container, padding: "0 22px 60px", maxWidth: 820 }}>
            {eyebrowEl}
            <div style={{ height: 10 }} />
            {h1}
            <div style={{ height: 14 }} />
            {sub}
            {ctas}
          </div>
        </header>
      );
    }
    if (t.hero === "split") {
      return (
        <header style={{ background: p.surface }}>
          <div
            style={{
              ...container,
              display: "grid",
              gap: 40,
              gridTemplateColumns: hero ? "1.05fr 0.95fr" : "1fr",
              alignItems: "center",
              padding: "72px 22px",
            }}
          >
            <div>
              {eyebrowEl}
              <div style={{ height: 10 }} />
              {h1}
              <div style={{ height: 14 }} />
              {sub}
              {ctas}
            </div>
            {hero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero}
                alt={c.businessName}
                style={{ width: "100%", height: 360, objectFit: "cover", borderRadius: R, border: `1px solid ${p.border}` }}
              />
            )}
          </div>
        </header>
      );
    }
    if (t.hero === "gradient") {
      return (
        <header
          style={{
            background: `radial-gradient(120% 80% at 50% -10%, ${p.accent}22, ${p.bg} 60%)`,
            textAlign: "center",
            paddingTop: 96,
          }}
        >
          <div style={{ ...container, maxWidth: 760 }}>
            {eyebrowEl}
            <div style={{ height: 12 }} />
            {h1}
            <div style={{ height: 16 }} />
            {sub}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 26 }}>
              <a href="#contact" style={btn("solid")}>
                <EditableText editable={editable} value={c.ctaLabel} onChange={(v) => set({ ctaLabel: v })} />
              </a>
              {waHref && (
                <a href={waHref} target="_blank" rel="noreferrer" style={btn("wa")}>
                  <Wa /> WhatsApp
                </a>
              )}
            </div>
            {hero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero}
                alt={c.businessName}
                style={{
                  width: "100%",
                  height: 340,
                  objectFit: "cover",
                  borderRadius: R,
                  border: `1px solid ${p.border}`,
                  marginTop: 44,
                  boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
                }}
              />
            )}
          </div>
        </header>
      );
    }
    if (t.hero === "card") {
      return (
        <header style={{ padding: "48px 0", minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <div
            style={{
              ...card(),
              width: "min(94vw, 520px)",
              padding: 30,
              textAlign: "center",
              borderRadius: R,
            }}
          >
            {hero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero}
                alt={c.businessName}
                style={{ width: "100%", height: 190, objectFit: "cover", borderRadius: Math.max(R - 8, 4), marginBottom: 20 }}
              />
            )}
            <EditableText
              as="h1"
              editable={editable}
              value={c.businessName}
              onChange={(v) => set({ businessName: v })}
            />
            <div style={{ height: 8 }} />
            {eyebrowEl}
            <div style={{ height: 14 }} />
            {sub}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
              {c.phone && (
                <a href={`tel:${c.phone}`} style={btn("solid")}>
                  Call
                </a>
              )}
              {waHref && (
                <a href={waHref} target="_blank" rel="noreferrer" style={btn("wa")}>
                  <Wa /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </header>
      );
    }
    // minimal
    return (
      <header style={{ padding: "120px 0 64px" }}>
        <div style={{ ...container, maxWidth: 800 }}>
          {eyebrowEl}
          <div style={{ height: 18 }} />
          {h1}
          <div style={{ height: 18 }} />
          {sub}
          <div style={{ marginTop: 28 }}>
            <a href="#contact" style={{ ...btn("ghost") }}>
              <EditableText editable={editable} value={c.ctaLabel} onChange={(v) => set({ ctaLabel: v })} />
            </a>
          </div>
        </div>
      </header>
    );
  }

  return (
    <div style={{ background: p.bg, color: p.text, fontFamily: font.body, minHeight: "100%" }}>
      <style>{`
        @import url('${font.import}');
        .ub h1{font-family:${font.heading};font-size:clamp(30px,5.4vw,52px);line-height:1.06;font-weight:700;margin:0}
        .ub h2{font-family:${font.heading};font-size:clamp(22px,3.4vw,32px);line-height:1.15;font-weight:700;margin:0}
        .ub h3{font-family:${font.heading};font-size:17px;font-weight:600;margin:0}
        .ub p{margin:0;line-height:1.7;font-size:16px}
        .ub-hd a:hover{color:${p.accent}}
        .ub-fab{position:fixed;right:18px;bottom:18px;z-index:50;width:56px;height:56px;border-radius:999px;background:#25D366;display:grid;place-items:center;box-shadow:0 8px 24px rgba(0,0,0,0.28);animation:ubpulse 2.6s ease-in-out infinite}
        @keyframes ubpulse{0%,100%{box-shadow:0 8px 24px rgba(37,211,102,0.35)}50%{box-shadow:0 8px 24px rgba(37,211,102,0)}}
        @media(max-width:720px){.ub-hd nav{display:none}}
      `}</style>

      <div className="ub">
        {/* sticky header */}
        <div
          className="ub-hd"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: `${p.bg}f2`,
            backdropFilter: "blur(10px)",
            borderBottom: `1px solid ${p.border}`,
          }}
        >
          <div
            style={{
              ...container,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 60,
            }}
          >
            <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 17 }}>
              {c.businessName}
            </span>
            <nav style={{ display: "flex", gap: 22, alignItems: "center" }}>
              {nav.map((s) => (
                <a
                  key={s}
                  href={`#${s}`}
                  style={{ fontSize: 14, color: p.muted, textDecoration: "none", textTransform: "capitalize" }}
                >
                  {s}
                </a>
              ))}
              <a
                href={waHref || "#contact"}
                target={waHref ? "_blank" : undefined}
                rel="noreferrer"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  background: p.accent,
                  padding: "8px 16px",
                  borderRadius: 999,
                  textDecoration: "none",
                }}
              >
                {c.ctaLabel || "Contact"}
              </a>
            </nav>
          </div>
        </div>

        {t.sections.map((id, i) => (
          <React.Fragment key={`${id}-${i}`}>{S[id]}</React.Fragment>
        ))}

        <footer style={{ padding: "36px 0", textAlign: "center", color: p.muted, fontSize: 13, borderTop: `1px solid ${p.border}` }}>
          <div style={container}>
            <EditableText
              as="div"
              editable={editable}
              value={c.footerNote}
              onChange={(v) => set({ footerNote: v })}
            />
            <div style={{ height: 6 }} />
            {c.businessName} · site by Unbuilt
          </div>
        </footer>
      </div>

      {waHref && (
        <a className="ub-fab" href={waHref} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
          <Wa size={28} light />
        </a>
      )}
    </div>
  );
}

function Wa({ size = 16, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={light ? "#fff" : "currentColor"}>
      <path d={WA_ICON} />
    </svg>
  );
}

// keep the old type import path working
export type { ThemePalette, TemplateConfig };
