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
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        size === "icon" && "h-10 w-10 p-0",
        variant === "primary" && "bg-accent text-white hover:bg-accent-deep shadow-sm",
        variant === "outline" && "border border-gray-300 text-gray-800 hover:bg-gray-50",
        variant === "ghost" && "text-gray-600 hover:bg-gray-100",
        variant === "subtle" && "bg-gray-100 text-gray-800 hover:bg-gray-200",
        variant === "danger" && "bg-pin-red text-white hover:brightness-95",
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
  tone?: "neutral" | "accent" | "green" | "pink" | "red" | "blue" | "orange" | "purple";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "neutral" && "bg-gray-100 text-gray-600",
        tone === "accent" && "bg-accent-wash text-accent-deep",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "pink" && "bg-pink-50 text-pink-600",
        tone === "red" && "bg-red-50 text-red-600",
        tone === "blue" && "bg-sky-50 text-sky-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "purple" && "bg-violet-50 text-violet-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone =
    score >= 70 ? "orange" : score >= 40 ? "accent" : score >= 1 ? "neutral" : "neutral";
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
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
    </label>
  );
}

const fieldBase =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldBase, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldBase, props.className)} />;
}
