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
import { getMotion, motionCss, type MotionSpec } from "@/lib/motion";
import { resolvePhotoUrl } from "@/lib/photos";
import { whatsappLink } from "@/lib/whatsapp";
import type { SiteContent, SitePhoto } from "@/lib/types";
import { EditableText } from "./EditableText";

interface Props {
  templateId: string;
  theme: string;
  content: SiteContent;
  photos: SitePhoto[];
  /** Motion preset id. Defaults to the template's own. */
  motion?: string;
  editable?: boolean;
  onContent?: (patch: Partial<SiteContent>) => void;
}

const WA_ICON =
  "M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.8 14.3c-.25.7-1.45 1.35-2 1.4-.5.05-1.15.07-1.85-.12a10 10 0 0 1-1.7-.6 12.6 12.6 0 0 1-4.9-4.35c-.36-.5-.9-1.4-.9-2.66 0-1.27.66-1.9.9-2.16.24-.26.53-.32.7-.32h.5c.16 0 .38-.06.6.45l.8 1.95c.06.13.1.29.02.45-.1.2-.15.32-.3.5l-.44.5c-.14.15-.29.3-.12.6.16.3.72 1.2 1.55 1.94 1.06.95 1.96 1.24 2.24 1.38.28.15.44.12.6-.07.16-.2.7-.8.88-1.08.19-.28.37-.23.62-.14.25.1 1.6.75 1.87.9.28.13.46.2.53.3.06.13.06.7-.19 1.4Z";

type Anim = "fade" | "up" | "down" | "left" | "right" | "scale" | "blur" | "clip";

/** Wraps a block so it fades in the first time it scrolls into view. */
function Reveal({
  anim = "up",
  i = 0,
  step = 0,
  as: Tag = "div",
  style,
  className,
  id,
  children,
}: {
  anim?: Anim;
  /** Position within a staggered group. */
  i?: number;
  /** Per-item delay in ms. 0 disables the stagger. */
  step?: number;
  as?: "div" | "section" | "header" | "li" | "span";
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      id={id}
      className={className}
      data-anim={anim}
      style={{ ...style, ["--ub-d" as string]: `${i * step}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Counts a numeric value up from zero, keeping any prefix/suffix intact. */
function Counter({ text, run }: { text: string; run: boolean }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const match = /^([^\d]*)(\d+(?:\.\d+)?)(.*)$/.exec(text ?? "");
  const [shown, setShown] = React.useState<string>(run && match ? `${match[1]}0${match[3]}` : text);

  React.useEffect(() => {
    if (!run || !match) {
      setShown(text);
      return;
    }
    const target = Number(match[2]);
    const decimals = (match[2].split(".")[1] ?? "").length;
    const node = ref.current;
    if (!node) return;

    let raf = 0;
    let started = false;
    const animate = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / 1400);
        const eased = 1 - Math.pow(1 - k, 3);
        setShown(`${match[1]}${(target * eased).toFixed(decimals)}${match[3]}`);
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !started) {
          started = true;
          animate();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text, run, match?.[2]]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref}>{shown}</span>;
}

export function SiteTemplate({
  templateId,
  theme,
  content: c,
  photos,
  motion,
  editable = false,
  onContent,
}: Props) {
  const t = getTemplate(templateId);
  const p = getThemePalette(theme);
  const font = FONT_STACKS[t.font];
  const m = getMotion(motion ?? t.motion);
  const set = (patch: Partial<SiteContent>) => onContent?.(patch);
  const R = t.radius;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const heroArtRef = React.useRef<HTMLDivElement>(null);

  // ── Reveal-on-scroll ───────────────────────────────────────────────────────
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (m.dur === 0) {
      root.classList.remove("ub-ready");
      return;
    }
    root.classList.add("ub-ready");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("ub-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const observeAll = () => {
      root.querySelectorAll("[data-anim]:not(.ub-in)").forEach((el) => io.observe(el));
    };
    observeAll();

    // Inline editing and template switches add nodes after mount.
    const mo = new MutationObserver(observeAll);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [m.dur, templateId, theme]);

  // ── Hero parallax ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    const art = heroArtRef.current;
    if (!art || !m.parallax) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // The editor renders the site inside a scrolling panel, so listen to the
    // nearest scrollable ancestor as well as the window.
    let scroller: HTMLElement | null = art.parentElement;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) {
      scroller = scroller.parentElement;
    }

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const top = art.getBoundingClientRect().top;
        art.style.transform = `translate3d(0, ${Math.max(-90, top * -0.16)}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, [m.parallax, templateId]);

  const gallery = (photos ?? [])
    .map((ph) => ({ ...ph, url: resolvePhotoUrl(ph.url, 1400) }))
    .filter((ph) => ph.url);
  const hero = gallery[0]?.url;
  const waHref = c.whatsapp ? whatsappLink(c.whatsapp, c.whatsappMessage) : "";
  const step = m.stagger;

  const nav = t.sections.filter((s) =>
    (["about", "services", "gallery", "hours", "contact"] as SectionId[]).includes(s),
  );

  // ── Shared styling ─────────────────────────────────────────────────────────
  const eyebrow: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: t.uppercaseEyebrow ? "0.16em" : "0.02em",
    textTransform: t.uppercaseEyebrow ? "uppercase" : "none",
    color: p.accent,
  };
  const btnClass = (variant: "solid" | "ghost" | "wa") =>
    variant === "solid" ? "ub-btn ub-btn-solid" : "ub-btn";
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
    background: variant === "solid" ? p.accent : variant === "wa" ? "#25D366" : "transparent",
    color: variant === "ghost" ? p.accent : variant === "solid" ? p.accentText : "#fff",
  });
  const section = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: "clamp(48px, 8vw, 92px) 0",
    position: "relative",
    ...extra,
  });
  const container: React.CSSProperties = {
    width: "100%",
    maxWidth: 1080,
    margin: "0 auto",
    padding: "0 22px",
  };
  const card = (): React.CSSProperties => {
    const base: React.CSSProperties = { borderRadius: Math.max(R - 4, 4), padding: 22 };
    if (t.cards === "bordered") return { ...base, border: `1px solid ${p.border}`, background: p.bg };
    if (t.cards === "elevated")
      return {
        ...base,
        background: p.bg,
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        border: `1px solid ${p.border}`,
      };
    if (t.cards === "flat") return { ...base, background: p.surface };
    if (t.cards === "glass")
      return {
        ...base,
        background: p.dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)",
        backdropFilter: "blur(14px)",
        border: `1px solid ${p.dark ? "rgba(255,255,255,0.12)" : p.border}`,
        boxShadow: "0 12px 40px rgba(0,0,0,0.16)",
      };
    return { ...base, background: p.surface, border: `1px solid ${p.border}` };
  };

  /** Soft coloured blobs that drift behind a section. */
  const Orbs = ({ opacity = 0.5 }: { opacity?: number }) =>
    m.ambient ? (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity, zIndex: 0 }}>
        <span
          className="ub-orb"
          style={{ width: 420, height: 420, top: "-16%", left: "-8%", background: p.accent, opacity: 0.35 }}
        />
        <span
          className="ub-orb"
          style={{
            width: 340,
            height: 340,
            bottom: "-18%",
            right: "-6%",
            background: p.accent2,
            opacity: 0.3,
            animationDelay: "-9s",
          }}
        />
      </div>
    ) : null;

  /** Headline that wipes in word by word when the preset asks for it. */
  const Headline = ({ text, onChange }: { text: string; onChange: (v: string) => void }) => {
    if (editable || !m.wordReveal) {
      return <EditableText as="h1" editable={editable} value={text} onChange={onChange} />;
    }
    return (
      <h1>
        {text.split(" ").map((w, i) => (
          <span
            key={i}
            data-anim="up"
            style={{ display: "inline-block", ["--ub-d" as string]: `${i * 60}ms` }}
          >
            {w}
            {i < text.split(" ").length - 1 ? " " : ""}
          </span>
        ))}
      </h1>
    );
  };

  const Shot = ({
    src,
    alt,
    style,
  }: {
    src: string;
    alt: string;
    style?: React.CSSProperties;
  }) => (
    <div
      className="ub-shot"
      style={{ borderRadius: Math.max(R - 6, 4), border: `1px solid ${p.border}`, ...style }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );

  // ── Editing helpers ────────────────────────────────────────────────────────
  const addService = () =>
    set({
      services: [
        ...(c.services ?? []),
        { title: "New service", body: "Describe it in one sentence." },
      ],
    });
  const removeService = (i: number) =>
    set({ services: (c.services ?? []).filter((_, j) => j !== i) });
  const editService = (i: number, patch: { title?: string; body?: string }) =>
    set({ services: (c.services ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const editHighlight = (i: number, patch: { value?: string; label?: string }) =>
    set({ highlights: (c.highlights ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const RemoveBtn = ({ onClick, label }: { onClick: () => void; label: string }) =>
    editable ? (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 22,
          height: 22,
          borderRadius: 999,
          border: "none",
          background: "rgba(0,0,0,0.5)",
          color: "#fff",
          fontSize: 13,
          lineHeight: "22px",
          cursor: "pointer",
          zIndex: 3,
        }}
      >
        ×
      </button>
    ) : null;

  const AddBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) =>
    editable ? (
      <button
        type="button"
        onClick={onClick}
        style={{
          marginTop: 16,
          padding: "9px 18px",
          borderRadius: 999,
          border: `1.5px dashed ${p.border}`,
          background: "transparent",
          color: p.muted,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {children}
      </button>
    ) : null;

  // ── Sections ───────────────────────────────────────────────────────────────
  const Highlights = () => {
    const items = (c.highlights ?? []).slice(0, 3);
    if (!items.length) return null;

    const Value = ({ v, i }: { v: string; i: number }) =>
      editable ? (
        <EditableText
          editable
          value={v}
          onChange={(x) => editHighlight(i, { value: x })}
          style={{ fontFamily: font.heading, fontSize: 26, fontWeight: 700, color: p.text }}
        />
      ) : (
        <span style={{ fontFamily: font.heading, fontSize: 26, fontWeight: 700, color: p.text }}>
          <Counter text={v} run={m.counters} />
        </span>
      );
    const Label = ({ v, i }: { v: string; i: number }) => (
      <EditableText
        editable={editable}
        value={v}
        onChange={(x) => editHighlight(i, { label: x })}
        style={{ fontSize: 12.5, color: p.muted, display: "block", marginTop: 4 }}
      />
    );

    if (t.highlights === "cards") {
      return (
        <section style={section({ paddingTop: 0 })}>
          <div
            style={{
              ...container,
              display: "grid",
              gap: 14,
              gridTemplateColumns: `repeat(auto-fit,minmax(200px,1fr))`,
            }}
          >
            {items.map((h, i) => (
              <Reveal key={i} anim="up" i={i} step={step} style={{ ...card(), textAlign: "center" }}>
                <div className="ub-card">
                  <Value v={h.value} i={i} />
                  <Label v={h.label} i={i} />
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      );
    }

    if (t.highlights === "inline") {
      return (
        <section style={section({ paddingTop: 0, paddingBottom: "clamp(24px,4vw,44px)" })}>
          <Reveal
            anim="up"
            style={{
              ...container,
              display: "flex",
              flexWrap: "wrap",
              gap: "14px 44px",
              justifyContent: t.centered ? "center" : "flex-start",
              alignItems: "baseline",
            }}
          >
            {items.map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <Value v={h.value} i={i} />
                <EditableText
                  editable={editable}
                  value={h.label}
                  onChange={(x) => editHighlight(i, { label: x })}
                  style={{ fontSize: 12.5, color: p.muted }}
                />
              </div>
            ))}
          </Reveal>
        </section>
      );
    }

    // bar
    return (
      <section style={section({ paddingTop: 0 })}>
        <div style={container}>
          <Reveal
            anim="up"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`,
              gap: 1,
              background: p.border,
              border: `1px solid ${p.border}`,
              borderRadius: R,
              overflow: "hidden",
            }}
          >
            {items.map((h, i) => (
              <div key={i} style={{ background: p.bg, padding: "22px 18px", textAlign: "center" }}>
                <Value v={h.value} i={i} />
                <Label v={h.label} i={i} />
              </div>
            ))}
          </Reveal>
        </div>
      </section>
    );
  };

  const Services = () => {
    const items = c.services ?? [];
    if (!items.length && !editable) return null;

    const Title = ({ s, i }: { s: { title: string }; i: number }) => (
      <EditableText
        as="h3"
        editable={editable}
        value={s.title}
        onChange={(v) => editService(i, { title: v })}
      />
    );
    const Body = ({ s, i }: { s: { body: string }; i: number }) => (
      <EditableText
        as="p"
        editable={editable}
        multiline
        value={s.body}
        onChange={(v) => editService(i, { body: v })}
        style={{ color: p.muted }}
      />
    );

    const heading = (
      <>
        <p style={eyebrow}>What we offer</p>
        <div style={{ height: 18 }} />
      </>
    );

    if (t.services === "list") {
      return (
        <section id="services" style={section()}>
          <div style={container}>
            <Reveal anim="up">{heading}</Reveal>
            <div style={{ borderTop: `1px solid ${p.border}` }}>
              {items.map((s, i) => (
                <Reveal
                  key={i}
                  anim="up"
                  i={i}
                  step={step}
                  style={{
                    position: "relative",
                    display: "grid",
                    gap: 8,
                    gridTemplateColumns: "minmax(160px,0.7fr) 1.3fr",
                    alignItems: "start",
                    padding: "24px 0",
                    borderBottom: `1px solid ${p.border}`,
                  }}
                >
                  <RemoveBtn onClick={() => removeService(i)} label="Remove service" />
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span style={{ ...eyebrow, fontSize: 11, opacity: 0.7 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Title s={s} i={i} />
                  </div>
                  <Body s={s} i={i} />
                </Reveal>
              ))}
            </div>
            <AddBtn onClick={addService}>+ Add a service</AddBtn>
          </div>
        </section>
      );
    }

    if (t.services === "split") {
      return (
        <section id="services" style={section()}>
          <div
            style={{
              ...container,
              display: "grid",
              gap: 40,
              gridTemplateColumns: "minmax(180px,0.55fr) 1.45fr",
            }}
          >
            <Reveal anim="up">
              <p style={eyebrow}>What we offer</p>
            </Reveal>
            <div>
              {items.map((s, i) => (
                <Reveal
                  key={i}
                  anim="up"
                  i={i}
                  step={step}
                  style={{
                    position: "relative",
                    padding: "0 0 26px",
                    marginBottom: 26,
                    borderBottom: i < items.length - 1 ? `1px solid ${p.border}` : "none",
                  }}
                >
                  <RemoveBtn onClick={() => removeService(i)} label="Remove service" />
                  <Title s={s} i={i} />
                  <div style={{ height: 8 }} />
                  <Body s={s} i={i} />
                </Reveal>
              ))}
              <AddBtn onClick={addService}>+ Add a service</AddBtn>
            </div>
          </div>
        </section>
      );
    }

    const numbered = t.services === "numbered";
    return (
      <section id="services" style={section()}>
        <div style={container}>
          <Reveal anim="up">{heading}</Reveal>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            }}
          >
            {items.map((s, i) => (
              <Reveal key={i} anim="up" i={i} step={step}>
                <div className="ub-card" style={{ ...card(), position: "relative", height: "100%" }}>
                  <RemoveBtn onClick={() => removeService(i)} label="Remove service" />
                  {numbered ? (
                    <div
                      style={{
                        fontFamily: font.heading,
                        fontSize: 30,
                        fontWeight: 700,
                        color: p.accent,
                        opacity: 0.32,
                        lineHeight: 1,
                        marginBottom: 14,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: `linear-gradient(135deg, ${p.accent}, ${p.accent2})`,
                        opacity: 0.9,
                        marginBottom: 12,
                      }}
                    />
                  )}
                  <Title s={s} i={i} />
                  <div style={{ height: 6 }} />
                  <Body s={s} i={i} />
                </div>
              </Reveal>
            ))}
          </div>
          <AddBtn onClick={addService}>+ Add a service</AddBtn>
        </div>
      </section>
    );
  };

  const Gallery = () => {
    if (gallery.length < 2) return null;
    const shots = gallery.slice(0, 9);

    if (t.gallery === "marquee") {
      const strip = [...shots, ...shots];
      return (
        <section id="gallery" style={section({ overflow: "hidden" })}>
          <div style={{ ...container, marginBottom: 18 }}>
            <Reveal anim="up">
              <p style={eyebrow}>Gallery</p>
            </Reveal>
          </div>
          <div className="ub-marq" style={{ gap: 14 }}>
            {strip.map((ph, i) => (
              <Shot
                key={i}
                src={ph.url}
                alt={ph.alt || c.businessName}
                style={{ width: 300, height: 210, flex: "0 0 auto" }}
              />
            ))}
          </div>
        </section>
      );
    }

    if (t.gallery === "stack") {
      return (
        <section id="gallery" style={section()}>
          <div style={container}>
            <Reveal anim="up">
              <p style={eyebrow}>Gallery</p>
            </Reveal>
            <div style={{ display: "grid", gap: 22, marginTop: 18 }}>
              {shots.slice(0, 4).map((ph, i) => (
                <Reveal
                  key={i}
                  anim={i % 2 ? "right" : "left"}
                  style={{
                    width: i % 2 ? "78%" : "92%",
                    marginLeft: i % 2 ? "auto" : 0,
                  }}
                >
                  <Shot src={ph.url} alt={ph.alt || c.businessName} style={{ height: 320 }} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (t.gallery === "mosaic") {
      return (
        <section id="gallery" style={section()}>
          <div style={container}>
            <Reveal anim="up">
              <p style={eyebrow}>Gallery</p>
            </Reveal>
            <div
              className="ub-mosaic"
              style={{
                marginTop: 16,
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(4, 1fr)",
                gridAutoRows: 150,
              }}
            >
              {shots.map((ph, i) => {
                const big = i === 0 || i === 5;
                return (
                  <Reveal
                    key={i}
                    anim="scale"
                    i={i}
                    step={step}
                    style={{
                      gridColumn: big ? "span 2" : "span 1",
                      gridRow: big ? "span 2" : "span 1",
                      minHeight: 0,
                    }}
                  >
                    <Shot
                      src={ph.url}
                      alt={ph.alt || c.businessName}
                      style={{ height: "100%" }}
                    />
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      );
    }

    // grid
    return (
      <section id="gallery" style={section()}>
        <div style={container}>
          <Reveal anim="up">
            <p style={eyebrow}>Gallery</p>
          </Reveal>
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            }}
          >
            {shots.map((ph, i) => (
              <Reveal key={i} anim="scale" i={i} step={step}>
                <Shot src={ph.url} alt={ph.alt || c.businessName} style={{ height: 210 }} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const S: Record<SectionId, React.ReactNode> = {
    hero: <Hero />,
    highlights: <Highlights />,
    services: <Services />,
    about: (
      <section id="about" style={section({ background: p.surface, overflow: "hidden" })}>
        <Orbs opacity={0.3} />
        <div style={{ ...container, maxWidth: 760, position: "relative", zIndex: 1 }}>
          <Reveal anim="up">
            <p style={eyebrow}>About</p>
          </Reveal>
          <div style={{ height: 10 }} />
          <Reveal anim="up" i={1} step={step}>
            <EditableText
              as="h2"
              editable={editable}
              value={c.aboutTitle}
              onChange={(v) => set({ aboutTitle: v })}
            />
          </Reveal>
          <div style={{ height: 12 }} />
          <Reveal anim="up" i={2} step={step}>
            <EditableText
              as="p"
              editable={editable}
              multiline
              value={c.aboutBody}
              onChange={(v) => set({ aboutBody: v })}
              style={{ color: p.muted }}
            />
          </Reveal>
        </div>
      </section>
    ),
    gallery: <Gallery />,
    hours:
      c.hours?.length > 0 ? (
        <section id="hours" style={section({ background: t.cards === "glass" ? p.bg : p.surface })}>
          <div style={{ ...container, maxWidth: 560 }}>
            <Reveal anim="up">
              <EditableText
                as="h2"
                editable={editable}
                value={c.hoursTitle}
                onChange={(v) => set({ hoursTitle: v })}
              />
            </Reveal>
            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}>
              {c.hours.map((h, i) => {
                const [day, ...rest] = h.split(":");
                return (
                  <Reveal
                    key={i}
                    as="li"
                    anim="up"
                    i={i}
                    step={Math.min(step, 55)}
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
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null,
    contact: (
      <section
        id="contact"
        style={{ ...section(), background: p.band, color: p.bandText, overflow: "hidden" }}
      >
        <Orbs opacity={0.45} />
        <div
          style={{ ...container, maxWidth: 720, textAlign: "center", position: "relative", zIndex: 1 }}
        >
          <Reveal anim="up">
            <p style={{ ...eyebrow, color: p.accent }}>Get in touch</p>
          </Reveal>
          <div style={{ height: 12 }} />
          <Reveal anim="up" i={1} step={step}>
            <h2
              style={{
                fontFamily: font.heading,
                fontSize: "clamp(24px,4vw,34px)",
                fontWeight: 700,
                margin: 0,
              }}
            >
              {c.businessName}
            </h2>
          </Reveal>
          <div style={{ height: 14 }} />
          <Reveal anim="up" i={2} step={step}>
            <p style={{ fontSize: 15.5, lineHeight: 1.8, opacity: 0.9, margin: 0 }}>
              {c.address}
              {c.address && c.phone ? <br /> : null}
              {c.phone && (
                <a href={`tel:${c.phone}`} style={{ color: p.bandText, textDecoration: "underline" }}>
                  {c.phone}
                </a>
              )}
            </p>
          </Reveal>
          <div style={{ height: 22 }} />
          <Reveal
            anim="up"
            i={3}
            step={step}
            style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
          >
            {waHref && (
              <a href={waHref} target="_blank" rel="noreferrer" className={btnClass("wa")} style={btn("wa")}>
                <Wa /> Message on WhatsApp
              </a>
            )}
            {c.mapLink && (
              <a
                href={c.mapLink}
                target="_blank"
                rel="noreferrer"
                className={btnClass("solid")}
                style={btn("solid")}
              >
                Get directions
              </a>
            )}
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                className={btnClass("ghost")}
                style={{ ...btn("ghost"), borderColor: p.bandText, color: p.bandText }}
              >
                Call now
              </a>
            )}
          </Reveal>
        </div>
      </section>
    ),
  };

  // ── Hero ───────────────────────────────────────────────────────────────────
  function Hero() {
    const onImg = t.hero === "image";
    const onDark = onImg || t.hero === "mesh" || p.dark;
    const eyebrowEl = (
      <EditableText
        as="p"
        editable={editable}
        value={c.tagline}
        onChange={(v) => set({ tagline: v })}
        style={{ ...eyebrow, color: onImg ? "rgba(255,255,255,0.85)" : p.accent }}
      />
    );
    const h1 = <Headline text={c.heroHeadline} onChange={(v) => set({ heroHeadline: v })} />;
    const sub = (
      <EditableText
        as="p"
        editable={editable}
        multiline
        value={c.heroSub}
        onChange={(v) => set({ heroSub: v })}
        style={{ opacity: onDark ? 0.88 : 1, color: onImg ? "#fff" : onDark ? p.text : p.muted }}
      />
    );
    const ctas = (justify: "flex-start" | "center" = "flex-start") => (
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 26,
          justifyContent: justify,
        }}
      >
        <a href="#contact" className={btnClass("solid")} style={btn("solid")}>
          <EditableText editable={editable} value={c.ctaLabel} onChange={(v) => set({ ctaLabel: v })} />
        </a>
        {waHref && (
          <a href={waHref} target="_blank" rel="noreferrer" className={btnClass("wa")} style={btn("wa")}>
            <Wa /> WhatsApp
          </a>
        )}
      </div>
    );

    const ScrollHint = () =>
      m.ambient || m.kenburns ? (
        <div
          style={{
            position: "absolute",
            bottom: 18,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
          }}
        >
          <span
            className="ub-hint"
            style={{
              display: "block",
              width: 5,
              height: 5,
              borderRadius: 999,
              background: onImg ? "rgba(255,255,255,0.85)" : p.muted,
            }}
          />
        </div>
      ) : null;

    if (t.hero === "image") {
      return (
        <header
          style={{
            position: "relative",
            minHeight: "min(80vh, 660px)",
            display: "flex",
            alignItems: "flex-end",
            color: "#fff",
            overflow: "hidden",
            background: p.band,
          }}
        >
          {hero && (
            <div ref={heroArtRef} style={{ position: "absolute", inset: "-8% 0" }}>
              <div
                className={m.kenburns ? "ub-kb" : undefined}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `url(${hero}) center/cover`,
                }}
              />
            </div>
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.15) 38%, rgba(0,0,0,0.82) 100%)`,
            }}
          />
          <div
            style={{
              ...container,
              padding: "0 22px 68px",
              maxWidth: 860,
              position: "relative",
              zIndex: 1,
              textAlign: t.centered ? "center" : "left",
              margin: t.centered ? "0 auto" : undefined,
            }}
          >
            <Reveal anim="up">{eyebrowEl}</Reveal>
            <div style={{ height: 10 }} />
            <Reveal anim={m.wordReveal ? "fade" : "up"} i={1} step={step}>
              {h1}
            </Reveal>
            <div style={{ height: 14 }} />
            <Reveal anim="up" i={2} step={step}>
              {sub}
            </Reveal>
            <Reveal anim="up" i={3} step={step}>
              {ctas(t.centered ? "center" : "flex-start")}
            </Reveal>
          </div>
          <ScrollHint />
        </header>
      );
    }

    if (t.hero === "split") {
      return (
        <header style={{ background: p.surface, position: "relative", overflow: "hidden" }}>
          <div
            style={{
              ...container,
              display: "grid",
              gap: 40,
              gridTemplateColumns: hero ? "1.05fr 0.95fr" : "1fr",
              alignItems: "center",
              padding: "76px 22px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div>
              <Reveal anim="up">{eyebrowEl}</Reveal>
              <div style={{ height: 10 }} />
              <Reveal anim="up" i={1} step={step}>
                {h1}
              </Reveal>
              <div style={{ height: 14 }} />
              <Reveal anim="up" i={2} step={step}>
                {sub}
              </Reveal>
              <Reveal anim="up" i={3} step={step}>
                {ctas()}
              </Reveal>
            </div>
            {hero && (
              <Reveal anim="right" i={2} step={step}>
                <Shot src={hero} alt={c.businessName} style={{ height: 380, borderRadius: R }} />
              </Reveal>
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
            paddingTop: 100,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Orbs opacity={0.35} />
          <div style={{ ...container, maxWidth: 780, position: "relative", zIndex: 1 }}>
            <Reveal anim="up">{eyebrowEl}</Reveal>
            <div style={{ height: 12 }} />
            <Reveal anim="up" i={1} step={step}>
              {h1}
            </Reveal>
            <div style={{ height: 16 }} />
            <Reveal anim="up" i={2} step={step}>
              {sub}
            </Reveal>
            <Reveal anim="up" i={3} step={step}>
              {ctas("center")}
            </Reveal>
            {hero && (
              <Reveal anim="scale" i={4} step={step} style={{ marginTop: 46 }}>
                <Shot
                  src={hero}
                  alt={c.businessName}
                  style={{ height: 360, borderRadius: R, boxShadow: "0 24px 60px rgba(0,0,0,0.14)" }}
                />
              </Reveal>
            )}
          </div>
        </header>
      );
    }

    if (t.hero === "mesh") {
      return (
        <header
          style={{
            position: "relative",
            minHeight: "min(88vh, 720px)",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            overflow: "hidden",
            background: p.bg,
          }}
        >
          {/* Layered mesh: three tinted washes that drift independently. */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <span
              className="ub-orb"
              style={{ width: 620, height: 620, top: "-24%", left: "-14%", background: p.accent, opacity: 0.5 }}
            />
            <span
              className="ub-orb"
              style={{
                width: 520,
                height: 520,
                top: "8%",
                right: "-12%",
                background: p.accent2,
                opacity: 0.42,
                animationDelay: "-7s",
              }}
            />
            <span
              className="ub-orb"
              style={{
                width: 480,
                height: 480,
                bottom: "-26%",
                left: "28%",
                background: p.accent,
                opacity: 0.3,
                animationDelay: "-14s",
              }}
            />
          </div>
          <div style={{ ...container, maxWidth: 820, position: "relative", zIndex: 1, padding: "110px 22px 90px" }}>
            <Reveal anim="up">{eyebrowEl}</Reveal>
            <div style={{ height: 14 }} />
            <Reveal anim="up" i={1} step={step}>
              {h1}
            </Reveal>
            <div style={{ height: 18 }} />
            <Reveal anim="up" i={2} step={step}>
              {sub}
            </Reveal>
            <Reveal anim="up" i={3} step={step}>
              {ctas("center")}
            </Reveal>
          </div>
          <ScrollHint />
        </header>
      );
    }

    if (t.hero === "stage") {
      const strip = gallery.slice(0, 3);
      return (
        <header style={{ background: p.surface, position: "relative", overflow: "hidden" }}>
          <div
            style={{
              ...container,
              display: "grid",
              gap: 36,
              gridTemplateColumns: strip.length ? "1fr 0.85fr" : "1fr",
              alignItems: "center",
              padding: "80px 22px 70px",
            }}
          >
            <div>
              <Reveal anim="up">{eyebrowEl}</Reveal>
              <div style={{ height: 10 }} />
              <Reveal anim="up" i={1} step={step}>
                {h1}
              </Reveal>
              <div style={{ height: 14 }} />
              <Reveal anim="up" i={2} step={step}>
                {sub}
              </Reveal>
              <Reveal anim="up" i={3} step={step}>
                {ctas()}
              </Reveal>
            </div>
            {strip.length > 0 && (
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                {strip.map((ph, i) => (
                  <Reveal
                    key={i}
                    anim="scale"
                    i={i}
                    step={step}
                    style={{
                      gridColumn: i === 0 ? "span 2" : "span 1",
                      transform: i === 1 ? "translateY(10px)" : undefined,
                    }}
                  >
                    <Shot
                      src={ph.url}
                      alt={c.businessName}
                      style={{ height: i === 0 ? 230 : 150, borderRadius: R }}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </header>
      );
    }

    if (t.hero === "card") {
      return (
        <header
          style={{
            padding: "48px 0",
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Orbs opacity={0.3} />
          <Reveal
            anim="scale"
            style={{
              ...card(),
              width: "min(94vw, 520px)",
              padding: 30,
              textAlign: "center",
              borderRadius: R,
              position: "relative",
              zIndex: 1,
            }}
          >
            {hero && (
              <Shot
                src={hero}
                alt={c.businessName}
                style={{ height: 190, marginBottom: 20, borderRadius: Math.max(R - 8, 4) }}
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
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
                marginTop: 22,
              }}
            >
              {c.phone && (
                <a href={`tel:${c.phone}`} className={btnClass("solid")} style={btn("solid")}>
                  Call
                </a>
              )}
              {waHref && (
                <a href={waHref} target="_blank" rel="noreferrer" className={btnClass("wa")} style={btn("wa")}>
                  <Wa /> WhatsApp
                </a>
              )}
            </div>
          </Reveal>
        </header>
      );
    }

    // minimal
    return (
      <header style={{ padding: "128px 0 68px" }}>
        <div style={{ ...container, maxWidth: 820 }}>
          <Reveal anim="up">{eyebrowEl}</Reveal>
          <div style={{ height: 18 }} />
          <Reveal anim={m.wordReveal ? "fade" : "clip"} i={1} step={step}>
            {h1}
          </Reveal>
          <div style={{ height: 18 }} />
          <Reveal anim="up" i={2} step={step}>
            {sub}
          </Reveal>
          <Reveal anim="up" i={3} step={step} style={{ marginTop: 28 }}>
            <a href="#contact" className={btnClass("ghost")} style={btn("ghost")}>
              <EditableText
                editable={editable}
                value={c.ctaLabel}
                onChange={(v) => set({ ctaLabel: v })}
              />
            </a>
          </Reveal>
        </div>
      </header>
    );
  }

  // ── Header bar ─────────────────────────────────────────────────────────────
  const headerBar = (() => {
    const links = (
      <nav style={{ display: "flex", gap: 22, alignItems: "center" }}>
        {nav.map((s) => (
          <a
            key={s}
            href={`#${s}`}
            style={{
              fontSize: 14,
              color: p.muted,
              textDecoration: "none",
              textTransform: "capitalize",
            }}
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
            color: p.accentText,
            background: p.accent,
            padding: "8px 16px",
            borderRadius: 999,
            textDecoration: "none",
          }}
        >
          {c.ctaLabel || "Contact"}
        </a>
      </nav>
    );
    const brand = (
      <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: 17 }}>
        {c.businessName}
      </span>
    );

    if (t.nav === "float") {
      return (
        <div className="ub-hd" style={{ position: "sticky", top: 0, zIndex: 40, padding: "12px 14px 0" }}>
          <div
            style={{
              maxWidth: 1040,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              height: 56,
              padding: "0 18px",
              borderRadius: 999,
              background: p.dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.72)",
              backdropFilter: "blur(14px)",
              border: `1px solid ${p.dark ? "rgba(255,255,255,0.12)" : p.border}`,
              boxShadow: "0 8px 28px rgba(0,0,0,0.10)",
            }}
          >
            {brand}
            {links}
          </div>
        </div>
      );
    }

    if (t.nav === "minimal") {
      return (
        <div className="ub-hd" style={{ position: "relative", zIndex: 40 }}>
          <div
            style={{
              ...container,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 68,
            }}
          >
            {brand}
            {links}
          </div>
        </div>
      );
    }

    return (
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
          {brand}
          {links}
        </div>
      </div>
    );
  })();

  return (
    <div
      ref={rootRef}
      className="ub"
      style={{ background: p.bg, color: p.text, fontFamily: font.body, minHeight: "100%" }}
    >
      <style>{`
        @import url('${font.import}');
        .ub h1{font-family:${font.heading};font-size:clamp(32px,5.6vw,58px);line-height:1.04;font-weight:700;margin:0;letter-spacing:-0.02em}
        .ub h2{font-family:${font.heading};font-size:clamp(22px,3.4vw,34px);line-height:1.14;font-weight:700;margin:0;letter-spacing:-0.01em}
        .ub h3{font-family:${font.heading};font-size:17px;font-weight:600;margin:0}
        .ub p{margin:0;line-height:1.7;font-size:16px}
        .ub-hd a:hover{color:${p.accent}}
        .ub-fab{position:fixed;right:18px;bottom:18px;z-index:50;width:56px;height:56px;border-radius:999px;background:#25D366;display:grid;place-items:center;box-shadow:0 8px 24px rgba(0,0,0,0.28)}
        @media(max-width:760px){
          .ub-hd nav a:not(:last-child){display:none}
          .ub [style*="grid-template-columns"]{grid-template-columns:1fr!important}
          .ub-mosaic > *{grid-column:span 1!important;grid-row:span 1!important}
        }
        ${motionCss(m, p.accent)}
      `}</style>

      {headerBar}

      {t.sections.map((id, i) => (
        <React.Fragment key={`${id}-${i}`}>{S[id]}</React.Fragment>
      ))}

      <footer
        style={{
          padding: "36px 0",
          textAlign: "center",
          color: p.muted,
          fontSize: 13,
          borderTop: `1px solid ${p.border}`,
        }}
      >
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
export type { ThemePalette, TemplateConfig, MotionSpec };
