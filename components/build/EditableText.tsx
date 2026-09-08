"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Click-to-edit text. In editable mode a click swaps the rendered text for an
 * auto-growing textarea; blur (or Cmd/Ctrl+Enter) commits.
 */
export function EditableText({
  value,
  onChange,
  editable,
  as = "span",
  className,
  style,
  multiline = false,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => setDraft(value), [value]);

  React.useEffect(() => {
    if (editing && taRef.current) {
      const ta = taRef.current;
      ta.focus();
      ta.selectionStart = ta.value.length;
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [editing]);

  const Tag = as;

  if (!editable) {
    return (
      <Tag className={className} style={style}>
        {value || placeholder}
      </Tag>
    );
  }

  if (editing) {
    return (
      <textarea
        ref={taRef}
        value={draft}
        rows={multiline ? 3 : 1}
        onChange={(e) => {
          setDraft(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onChange(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={cn(
          "w-full resize-none rounded-md bg-black/5 outline outline-2 outline-blue-400/70",
          className,
        )}
        style={{ font: "inherit", color: "inherit", lineHeight: "inherit", ...style }}
      />
    );
  }

  return (
    <Tag
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-text rounded-md outline-dashed outline-1 outline-transparent transition hover:bg-blue-400/10 hover:outline-blue-400/40",
        className,
      )}
      style={style}
      title="Click to edit"
    >
      {value || <span className="opacity-40">{placeholder}</span>}
    </Tag>
  );
}
