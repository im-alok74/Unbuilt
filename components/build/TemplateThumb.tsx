"use client";

import * as React from "react";
import { getThemePalette, type TemplateConfig } from "@/lib/templates";

/**
 * A miniature wireframe of what a template actually produces — hero shape, nav
 * style, section rhythm — so the picker shows the difference instead of six
 * identical colour swatches. `animate` adds the same ambient motion the real
 * template ships with, at thumbnail scale.
 */
export function TemplateThumb({
  template: t,
  theme,
  animate = false,
  compact = false,
}: {
  template: TemplateConfig;
  theme: string;
  animate?: boolean;
  compact?: boolean;
}) {
  const p = getThemePalette(theme);
  const h = compact ? 62 : 116;
  const moving = animate && t.motion !== "off";

  const bar = (w: string, opacity = 1, bg = p.text) => (
    <span
      style={{
        display: "block",
        width: w,
        height: compact ? 2.5 : 4,
        borderRadius: 999,
        background: bg,
        opacity,
      }}
    />
  );
  const pill = (
    <span
      style={{
        display: "block",
        width: compact ? 14 : 26,
        height: compact ? 5 : 9,
        borderRadius: 999,
        background: p.accent,
      }}
    />
  );
  const gap = compact ? 3 : 6;
  const pad = compact ? 6 : 12;

  const tile = (extra?: React.CSSProperties) => ({
    background: p.surface,
    border: `1px solid ${p.border}`,
    borderRadius: compact ? 2 : 4,
    ...extra,
  });

  // ── Hero block ─────────────────────────────────────────────────────────────
  let hero: React.ReactNode;
  if (t.hero === "image" || t.hero === "stage") {
    hero = (
      <div style={{ position: "relative", height: h * 0.62, overflow: "hidden" }}>
        <div
          className={moving ? "ubt-kb" : undefined}
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${p.accent}, ${p.accent2})`,
            opacity: 0.85,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.6))",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: pad,
            right: pad,
            bottom: pad,
            display: "grid",
            gap,
          }}
        >
          {bar("70%", 0.95, "#fff")}
          {bar("46%", 0.6, "#fff")}
        </div>
      </div>
    );
  } else if (t.hero === "mesh" || t.hero === "gradient") {
    hero = (
      <div
        style={{
          position: "relative",
          height: h * 0.62,
          overflow: "hidden",
          background: p.bg,
          display: "grid",
          placeItems: "center",
        }}
      >
        <span
          className={moving ? "ubt-orb" : undefined}
          style={{
            position: "absolute",
            width: h,
            height: h,
            top: -h * 0.35,
            left: -h * 0.2,
            borderRadius: 999,
            filter: "blur(18px)",
            background: p.accent,
            opacity: 0.55,
          }}
        />
        <span
          className={moving ? "ubt-orb" : undefined}
          style={{
            position: "absolute",
            width: h * 0.8,
            height: h * 0.8,
            bottom: -h * 0.3,
            right: -h * 0.1,
            borderRadius: 999,
            filter: "blur(18px)",
            background: p.accent2,
            opacity: 0.5,
            animationDelay: "-6s",
          }}
        />
        <div style={{ display: "grid", gap, justifyItems: "center", position: "relative" }}>
          {bar(compact ? "34px" : "62px")}
          {bar(compact ? "22px" : "42px", 0.45)}
          {pill}
        </div>
      </div>
    );
  } else if (t.hero === "split") {
    hero = (
      <div
        style={{
          height: h * 0.62,
          background: p.surface,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap,
          alignItems: "center",
          padding: pad,
        }}
      >
        <div style={{ display: "grid", gap }}>
          {bar("90%")}
          {bar("70%", 0.45)}
          {pill}
        </div>
        <div
          style={{
            height: "100%",
            borderRadius: compact ? 3 : 5,
            background: `linear-gradient(135deg, ${p.accent}, ${p.accent2})`,
            opacity: 0.85,
          }}
        />
      </div>
    );
  } else if (t.hero === "card") {
    hero = (
      <div
        style={{
          height: h * 0.62,
          background: p.bg,
          display: "grid",
          placeItems: "center",
          padding: pad,
        }}
      >
        <div
          style={{
            ...tile({ width: "72%", padding: pad, display: "grid", gap, justifyItems: "center" }),
          }}
        >
          <span
            style={{
              width: "100%",
              height: compact ? 10 : 20,
              borderRadius: compact ? 2 : 4,
              background: `linear-gradient(135deg, ${p.accent}, ${p.accent2})`,
              opacity: 0.85,
            }}
          />
          {bar("60%")}
          {pill}
        </div>
      </div>
    );
  } else {
    // minimal
    hero = (
      <div
        style={{
          height: h * 0.62,
          background: p.bg,
          display: "grid",
          alignContent: "center",
          gap,
          padding: pad,
        }}
      >
        {bar("30%", 0.5, p.accent)}
        {bar("86%")}
        {bar("62%", 0.4)}
      </div>
    );
  }

  // ── Body block: mirrors the gallery / services layout ───────────────────────
  let body: React.ReactNode;
  if (t.gallery === "marquee") {
    body = (
      <div style={{ overflow: "hidden", padding: `${gap}px 0` }}>
        <div className={moving ? "ubt-marq" : undefined} style={{ display: "flex", gap, width: "max-content" }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              style={tile({
                width: compact ? 22 : 40,
                height: compact ? 14 : 26,
                flex: "0 0 auto",
              })}
            />
          ))}
        </div>
      </div>
    );
  } else if (t.gallery === "mosaic") {
    body = (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gridAutoRows: compact ? 9 : 16,
          gap,
          padding: `${gap}px ${pad}px`,
        }}
      >
        <span style={tile({ gridColumn: "span 2", gridRow: "span 2" })} />
        <span style={tile({})} />
        <span style={tile({})} />
        <span style={tile({})} />
        <span style={tile({})} />
      </div>
    );
  } else if (t.services === "list" || t.services === "split") {
    body = (
      <div style={{ display: "grid", gap, padding: `${gap}px ${pad}px` }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap,
              alignItems: "center",
              paddingBottom: gap,
              borderBottom: `1px solid ${p.border}`,
            }}
          >
            {bar("30%", 0.9, p.accent)}
            {bar("55%", 0.35)}
          </div>
        ))}
      </div>
    );
  } else {
    body = (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap,
          padding: `${gap}px ${pad}px`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span key={i} style={tile({ height: compact ? 14 : 26 })} />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        height: h,
        overflow: "hidden",
        background: p.bg,
        position: "relative",
        fontFamily: "inherit",
      }}
    >
      {/* nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${gap}px ${pad}px`,
          ...(t.nav === "float"
            ? {
                margin: `${gap}px ${pad}px 0`,
                borderRadius: 999,
                background: p.dark ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.75)",
                border: `1px solid ${p.border}`,
                position: "absolute",
                left: 0,
                right: 0,
                zIndex: 2,
              }
            : { borderBottom: t.nav === "solid" ? `1px solid ${p.border}` : "none" }),
        }}
      >
        {bar(compact ? "16px" : "30px", 0.85)}
        <span style={{ display: "flex", gap: gap }}>
          {bar(compact ? "6px" : "12px", 0.3)}
          {bar(compact ? "6px" : "12px", 0.3)}
        </span>
      </div>
      {hero}
      {body}
    </div>
  );
}
