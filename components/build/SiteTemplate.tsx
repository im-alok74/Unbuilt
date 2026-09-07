"use client";

import * as React from "react";
import { getThemePalette } from "@/lib/templates";
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

type Layout = "center" | "split" | "minimal" | "card";

function layoutFor(id: string): Layout {
  switch (id) {
    case "clean-services":
    case "trusted-clinic":
      return "split";
    case "studio-minimal":
      return "minimal";
    case "classic-card":
      return "card";
    default:
      return "center";
  }
}

export function SiteTemplate({
  templateId,
  theme,
  content,
  photos,
  editable = false,
  onContent,
}: Props) {
  const p = getThemePalette(theme);
  const layout = layoutFor(templateId);
  const hero = photos[0]?.url;
  const set = (patch: Partial<SiteContent>) => onContent?.(patch);

  const wrap: React.CSSProperties = {
    background: p.bg,
    color: p.text,
    fontFamily: "var(--font-geist-sans)",
    minHeight: "100%",
  };
  const container: React.CSSProperties = { maxWidth: 1040, margin: "0 auto", padding: "0 24px" };
  const btn: React.CSSProperties = {
    display: "inline-block",
    background: p.accent,
    color: p.accentText,
    padding: "12px 22px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 15,
    textDecoration: "none",
  };
  const section: React.CSSProperties = { padding: "56px 0", borderTop: `1px solid ${p.border}` };
  const eyebrow: React.CSSProperties = {
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: 12,
    fontWeight: 700,
    color: p.accent,
  };

  const Services = (
    <section style={section}>
      <div style={container}>
        <p style={eyebrow}>What we offer</p>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            marginTop: 18,
          }}
        >
          {content.services.map((s, i) => (
            <div
              key={i}
              style={{
                background: p.surface,
                border: `1px solid ${p.border}`,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <EditableText
                as="h3"
                editable={editable}
                value={s.title}
                onChange={(v) =>
                  set({
                    services: content.services.map((x, j) =>
                      j === i ? { ...x, title: v } : x,
                    ),
                  })
                }
                className=""
              />
              <div style={{ height: 6 }} />
              <EditableText
                as="p"
                editable={editable}
                multiline
                value={s.body}
                onChange={(v) =>
                  set({
                    services: content.services.map((x, j) =>
                      j === i ? { ...x, body: v } : x,
                    ),
                  })
                }
                className=""
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const About = (
    <section style={section}>
      <div style={{ ...container, maxWidth: 720 }}>
        <EditableText
          as="h2"
          editable={editable}
          value={content.aboutTitle}
          onChange={(v) => set({ aboutTitle: v })}
          className=""
        />
        <div style={{ height: 10 }} />
        <EditableText
          as="p"
          editable={editable}
          multiline
          value={content.aboutBody}
          onChange={(v) => set({ aboutBody: v })}
          className=""
        />
      </div>
    </section>
  );

  const Gallery = photos.length > 1 && (
    <section style={section}>
      <div style={container}>
        <p style={eyebrow}>Gallery</p>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            marginTop: 16,
          }}
        >
          {photos.slice(1, 9).map((ph, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={ph.url}
              alt={ph.alt}
              style={{
                width: "100%",
                height: 160,
                objectFit: "cover",
                borderRadius: 12,
                border: `1px solid ${p.border}`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );

  const Hours = content.hours.length > 0 && (
    <section style={section}>
      <div style={{ ...container, maxWidth: 560 }}>
        <EditableText
          as="h2"
          editable={editable}
          value={content.hoursTitle}
          onChange={(v) => set({ hoursTitle: v })}
          className=""
        />
        <div style={{ height: 12 }} />
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {content.hours.map((h, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: `1px solid ${p.border}`,
                fontSize: 14,
                color: p.muted,
              }}
            >
              <span>{h.split(":")[0]}</span>
              <span>{h.split(":").slice(1).join(":").trim()}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );

  const Contact = (
    <section style={section} id="contact">
      <div style={container}>
        <p style={eyebrow}>Get in touch</p>
        <div style={{ height: 12 }} />
        <p style={{ fontSize: 16, color: p.muted, lineHeight: 1.7 }}>
          {content.address && (
            <>
              {content.address}
              <br />
            </>
          )}
          {content.phone && (
            <>
              <a href={`tel:${content.phone}`} style={{ color: p.accent }}>
                {content.phone}
              </a>
              <br />
            </>
          )}
        </p>
        <div style={{ height: 18 }} />
        {content.mapLink && (
          <a href={content.mapLink} target="_blank" rel="noreferrer" style={btn}>
            {content.ctaLabel || "Find us"}
          </a>
        )}
      </div>
    </section>
  );

  const Footer = (
    <footer style={{ ...section, textAlign: "center", color: p.muted, fontSize: 13 }}>
      <div style={container}>
        <EditableText
          as="div"
          editable={editable}
          value={content.footerNote}
          onChange={(v) => set({ footerNote: v })}
          className=""
        />
        <div style={{ height: 6 }} />
        {content.businessName} · built with Unbuilt
      </div>
    </footer>
  );

  // ── Hero variants ───────────────────────────────────────────────────────────
  let Hero: React.ReactNode;
  if (layout === "center") {
    Hero = (
      <header
        style={{
          position: "relative",
          padding: "110px 0 90px",
          textAlign: "center",
          color: hero ? "#fff" : p.text,
          background: hero
            ? `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.6)), url(${hero}) center/cover`
            : p.surface,
        }}
      >
        <div style={{ ...container, maxWidth: 760 }}>
          <EditableText
            as="p"
            editable={editable}
            value={content.tagline}
            onChange={(v) => set({ tagline: v })}
            className=""
          />
          <div style={{ height: 10 }} />
          <EditableText
            as="h1"
            editable={editable}
            value={content.heroHeadline}
            onChange={(v) => set({ heroHeadline: v })}
            className=""
          />
          <div style={{ height: 14 }} />
          <EditableText
            as="p"
            editable={editable}
            multiline
            value={content.heroSub}
            onChange={(v) => set({ heroSub: v })}
            className=""
          />
          <div style={{ height: 24 }} />
          <a href="#contact" style={btn}>
            <EditableText
              editable={editable}
              value={content.ctaLabel}
              onChange={(v) => set({ ctaLabel: v })}
              className=""
            />
          </a>
        </div>
      </header>
    );
  } else if (layout === "split") {
    Hero = (
      <header style={{ background: p.surface, padding: "72px 0" }}>
        <div
          style={{
            ...container,
            display: "grid",
            gap: 32,
            gridTemplateColumns: hero ? "1.1fr 0.9fr" : "1fr",
            alignItems: "center",
          }}
        >
          <div>
            <EditableText as="p" editable={editable} value={content.tagline} onChange={(v) => set({ tagline: v })} className="" />
            <div style={{ height: 10 }} />
            <EditableText as="h1" editable={editable} value={content.heroHeadline} onChange={(v) => set({ heroHeadline: v })} className="" />
            <div style={{ height: 14 }} />
            <EditableText as="p" editable={editable} multiline value={content.heroSub} onChange={(v) => set({ heroSub: v })} className="" />
            <div style={{ height: 22 }} />
            <a href="#contact" style={btn}>
              <EditableText editable={editable} value={content.ctaLabel} onChange={(v) => set({ ctaLabel: v })} className="" />
            </a>
          </div>
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero}
              alt={content.businessName}
              style={{ width: "100%", height: 320, objectFit: "cover", borderRadius: 20, border: `1px solid ${p.border}` }}
            />
          )}
        </div>
      </header>
    );
  } else if (layout === "minimal") {
    Hero = (
      <header style={{ padding: "120px 0 70px" }}>
        <div style={{ ...container, maxWidth: 780 }}>
          <EditableText as="p" editable={editable} value={content.tagline} onChange={(v) => set({ tagline: v })} className="" />
          <div style={{ height: 16 }} />
          <EditableText as="h1" editable={editable} value={content.heroHeadline} onChange={(v) => set({ heroHeadline: v })} className="" />
          <div style={{ height: 18 }} />
          <EditableText as="p" editable={editable} multiline value={content.heroSub} onChange={(v) => set({ heroSub: v })} className="" />
          <div style={{ height: 26 }} />
          <a href="#contact" style={{ ...btn, background: "transparent", color: p.accent, border: `1.5px solid ${p.accent}` }}>
            <EditableText editable={editable} value={content.ctaLabel} onChange={(v) => set({ ctaLabel: v })} className="" />
          </a>
        </div>
      </header>
    );
  } else {
    Hero = (
      <header style={{ padding: "48px 0" }}>
        <div
          style={{
            ...container,
            maxWidth: 560,
            background: p.surface,
            border: `1px solid ${p.border}`,
            borderRadius: 24,
            padding: 32,
            textAlign: "center",
          }}
        >
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt="" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 16, marginBottom: 20 }} />
          )}
          <EditableText as="h1" editable={editable} value={content.businessName} onChange={(v) => set({ businessName: v })} className="" />
          <div style={{ height: 8 }} />
          <EditableText as="p" editable={editable} value={content.tagline} onChange={(v) => set({ tagline: v })} className="" />
          <div style={{ height: 16 }} />
          <EditableText as="p" editable={editable} multiline value={content.heroSub} onChange={(v) => set({ heroSub: v })} className="" />
          <div style={{ height: 20 }} />
          <a href="#contact" style={btn}>
            <EditableText editable={editable} value={content.ctaLabel} onChange={(v) => set({ ctaLabel: v })} className="" />
          </a>
        </div>
      </header>
    );
  }

  const order =
    layout === "split"
      ? [Hero, Services, About, Hours, Gallery, Contact, Footer]
      : layout === "minimal"
        ? [Hero, About, Services, Gallery, Hours, Contact, Footer]
        : layout === "card"
          ? [Hero, Services, Hours, Contact, Footer]
          : [Hero, About, Services, Gallery, Hours, Contact, Footer];

  return (
    <div style={wrap}>
      {/* base type scale */}
      <style>{`
        .ub-site h1{font-size:clamp(28px,5vw,46px);line-height:1.1;font-weight:800;margin:0}
        .ub-site h2{font-size:clamp(20px,3vw,28px);font-weight:700;margin:0}
        .ub-site h3{font-size:16px;font-weight:700;margin:0}
        .ub-site p{margin:0;line-height:1.65}
      `}</style>
      <div className="ub-site">{order.map((node, i) => <React.Fragment key={i}>{node}</React.Fragment>)}</div>
    </div>
  );
}
