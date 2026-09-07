"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger" | "subtle";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        size === "icon" && "h-10 w-10 p-0",
        variant === "primary" && "bg-accent text-ink-950 hover:bg-accent-soft",
        variant === "outline" &&
          "border border-white/15 text-white hover:bg-white/5",
        variant === "ghost" && "text-white/80 hover:bg-white/5",
        variant === "subtle" && "bg-white/8 text-white hover:bg-white/12",
        variant === "danger" && "bg-red-500/90 text-white hover:bg-red-500",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  children,
  tone = "neutral",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "green" | "pink" | "red" | "blue";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "neutral" && "bg-white/10 text-white/80",
        tone === "accent" && "bg-accent/20 text-accent-soft",
        tone === "green" && "bg-emerald-500/20 text-emerald-300",
        tone === "pink" && "bg-pink-500/20 text-pink-300",
        tone === "red" && "bg-red-500/20 text-red-300",
        tone === "blue" && "bg-sky-500/20 text-sky-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone =
    score >= 70 ? "pink" : score >= 40 ? "accent" : score >= 1 ? "green" : "neutral";
  return (
    <Badge tone={tone} className={cn("tabular-nums", className)}>
      {score}%
    </Badge>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      width={16}
      height={16}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-white/70">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-white/40">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/12 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-accent/60 focus:outline-none",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/12 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-accent/60 focus:outline-none",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/12 bg-ink-900 px-3 py-2 text-sm text-white focus:border-accent/60 focus:outline-none",
        props.className,
      )}
    />
  );
}
