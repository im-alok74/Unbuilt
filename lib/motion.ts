// ─── Motion system for generated sites ─────────────────────────────────────────
// Everything here is plain CSS + a tiny IntersectionObserver, so a published site
// ships zero animation dependencies and still degrades cleanly with JS off or
// `prefers-reduced-motion: reduce`.

export type MotionPreset = "off" | "subtle" | "lively" | "cinematic";

export const MOTION_PRESETS: {
  id: MotionPreset;
  name: string;
  blurb: string;
}[] = [
  { id: "off", name: "Off", blurb: "No animation at all. Fastest, calmest." },
  { id: "subtle", name: "Subtle", blurb: "Gentle fade-ups as you scroll. Safe for any business." },
  { id: "lively", name: "Lively", blurb: "Staggered reveals, counting stats, drifting gradients." },
  { id: "cinematic", name: "Cinematic", blurb: "Slow Ken Burns hero, parallax, sheen on buttons. Show-off mode." },
];

export interface MotionSpec {
  /** Reveal transition duration, ms. */
  dur: number;
  /** Travel distance for a fade-up, px. */
  y: number;
  /** Per-item delay inside a staggered group, ms. */
  stagger: number;
  ease: string;
  /** Ambient loops: drifting gradients, floating orbs, marquee. */
  ambient: boolean;
  /** Slow zoom on hero photography. */
  kenburns: boolean;
  /** Count highlight numbers up from zero. */
  counters: boolean;
  /** Hero art drifts against scroll. */
  parallax: boolean;
  /** Light sweep across primary buttons. */
  sheen: boolean;
  /** Headlines wipe in word by word. */
  wordReveal: boolean;
}

export const MOTION: Record<MotionPreset, MotionSpec> = {
  off: {
    dur: 0, y: 0, stagger: 0, ease: "linear",
    ambient: false, kenburns: false, counters: false, parallax: false, sheen: false, wordReveal: false,
  },
  subtle: {
    dur: 620, y: 16, stagger: 70, ease: "cubic-bezier(.22,.61,.36,1)",
    ambient: false, kenburns: false, counters: false, parallax: false, sheen: false, wordReveal: false,
  },
  lively: {
    dur: 760, y: 28, stagger: 95, ease: "cubic-bezier(.16,.84,.44,1)",
    ambient: true, kenburns: false, counters: true, parallax: false, sheen: true, wordReveal: false,
  },
  cinematic: {
    dur: 1050, y: 40, stagger: 130, ease: "cubic-bezier(.16,1,.3,1)",
    ambient: true, kenburns: true, counters: true, parallax: true, sheen: true, wordReveal: true,
  },
};

export function getMotion(preset: string | null | undefined): MotionSpec {
  return MOTION[(preset as MotionPreset) ?? "subtle"] ?? MOTION.subtle;
}

export function isMotionPreset(v: string): v is MotionPreset {
  return v === "off" || v === "subtle" || v === "lively" || v === "cinematic";
}

/**
 * The stylesheet injected into every rendered site. `accent` tints the ambient
 * washes so the motion belongs to the theme rather than sitting on top of it.
 */
export function motionCss(m: MotionSpec, accent: string): string {
  return `
  .ub{--ub-dur:${m.dur}ms;--ub-y:${m.y}px;--ub-ease:${m.ease}}

  /* Reveal-on-scroll. The pre-hidden state only applies once JS has marked the
     tree ready, so a no-JS visitor sees a complete page. */
  .ub-ready [data-anim]{opacity:0;will-change:opacity,transform}
  .ub-ready [data-anim="fade"]{transform:none}
  .ub-ready [data-anim="up"]{transform:translate3d(0,var(--ub-y),0)}
  .ub-ready [data-anim="down"]{transform:translate3d(0,calc(var(--ub-y) * -1),0)}
  .ub-ready [data-anim="left"]{transform:translate3d(calc(var(--ub-y) * -1.4),0,0)}
  .ub-ready [data-anim="right"]{transform:translate3d(calc(var(--ub-y) * 1.4),0,0)}
  .ub-ready [data-anim="scale"]{transform:scale(.94)}
  .ub-ready [data-anim="blur"]{filter:blur(10px);transform:translate3d(0,calc(var(--ub-y) * .6),0)}
  .ub-ready [data-anim="clip"]{clip-path:inset(0 0 100% 0);opacity:1}
  .ub-ready [data-anim].ub-in{
    opacity:1;transform:none;filter:none;clip-path:inset(0 0 0 0);
    transition:opacity var(--ub-dur) var(--ub-ease) var(--ub-d,0ms),
               transform var(--ub-dur) var(--ub-ease) var(--ub-d,0ms),
               filter var(--ub-dur) var(--ub-ease) var(--ub-d,0ms),
               clip-path var(--ub-dur) var(--ub-ease) var(--ub-d,0ms);
  }

  /* Ambient loops */
  @keyframes ub-drift{
    0%{transform:translate3d(0,0,0) scale(1)}
    33%{transform:translate3d(4%,-3%,0) scale(1.12)}
    66%{transform:translate3d(-3%,4%,0) scale(1.05)}
    100%{transform:translate3d(0,0,0) scale(1)}
  }
  @keyframes ub-kenburns{
    0%{transform:scale(1.02) translate3d(0,0,0)}
    100%{transform:scale(1.16) translate3d(-1.5%,-2%,0)}
  }
  @keyframes ub-marquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}
  @keyframes ub-sheen{0%{left:-140%}55%,100%{left:140%}}
  @keyframes ub-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  @keyframes ub-halo{0%,100%{box-shadow:0 8px 24px ${accent}59}50%{box-shadow:0 8px 34px ${accent}14}}
  @keyframes ub-scroll-hint{0%{transform:translateY(0);opacity:.9}70%{transform:translateY(11px);opacity:0}100%{opacity:0}}

  .ub-orb{position:absolute;border-radius:999px;filter:blur(60px);pointer-events:none}
  ${m.ambient ? `.ub-orb{animation:ub-drift 22s ease-in-out infinite}` : ``}
  ${m.kenburns ? `.ub-kb{animation:ub-kenburns 26s ease-in-out infinite alternate}` : ``}
  ${
    m.sheen
      ? `.ub-btn-solid{position:relative;overflow:hidden}
  .ub-btn-solid::after{content:"";position:absolute;top:-60%;left:-140%;width:55%;height:220%;
    background:linear-gradient(100deg,transparent,rgba(255,255,255,.42),transparent);
    transform:skewX(-18deg);animation:ub-sheen 4.6s ease-in-out infinite}`
      : ``
  }
  .ub-marq{display:flex;width:max-content;${m.ambient ? "animation:ub-marquee 42s linear infinite" : ""}}
  .ub-marq:hover{animation-play-state:paused}
  .ub-fab{${m.ambient || m.kenburns ? "animation:ub-halo 2.8s ease-in-out infinite" : ""}}
  .ub-hint{${m.ambient || m.kenburns ? "animation:ub-scroll-hint 2.4s ease-in-out infinite" : ""}}

  /* Hover affordances scale with the preset. */
  .ub-card{transition:transform .45s var(--ub-ease),box-shadow .45s var(--ub-ease)}
  ${
    m.dur > 0
      ? `.ub-card:hover{transform:translateY(-6px)}
  .ub-shot{overflow:hidden}
  .ub-shot img{transition:transform 1.1s var(--ub-ease)}
  .ub-shot:hover img{transform:scale(1.07)}`
      : ``
  }

  @media (prefers-reduced-motion: reduce){
    .ub-ready [data-anim]{opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important}
    .ub-orb,.ub-kb,.ub-marq,.ub-fab,.ub-hint,.ub-btn-solid::after{animation:none!important}
    .ub-card:hover,.ub-shot:hover img{transform:none!important}
  }`;
}
