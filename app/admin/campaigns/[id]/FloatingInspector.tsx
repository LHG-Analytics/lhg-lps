"use client";
import { useEffect, useState } from "react";
import type React from "react";

interface ElementInfo {
  selector: string;
  tagName: string;
  computedStyles: Record<string, string>;
}

interface Rect {
  top: number; left: number; right: number; bottom: number;
  width: number; height: number;
}

interface Props {
  picked: ElementInfo;
  rect: Rect;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  overrides: Record<string, Record<string, string>>;
  onOverride: (selector: string, prop: string, value: string) => void;
  onClose: () => void;
}

export function FloatingInspector({ picked, rect, iframeRef, overrides, onOverride, onClose }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;
    const ir = el.getBoundingClientRect();
    const scale = el.offsetWidth > 0 ? ir.width / el.offsetWidth : 1;

    const elTop    = ir.top  + rect.top  * scale;
    const elBottom = ir.top  + (rect.top + rect.height) * scale;
    const elLeft   = ir.left + rect.left * scale;

    const TOOLBAR_H = 38;
    const top  = elTop - TOOLBAR_H - 8 > 56 ? elTop - TOOLBAR_H - 8 : elBottom + 8;
    const left = Math.max(12, Math.min(window.innerWidth - 260, elLeft));
    setPos({ top, left });
  }, [rect, iframeRef]);

  /* Esc fecha */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!pos) return null;

  const sel = picked.selector;
  const cur = overrides[sel] ?? {};

  const computedSize = parseFloat(picked.computedStyles["font-size"] ?? "16") || 16;
  const overrideSize = cur["font-size"] ? parseFloat(cur["font-size"]) : null;
  const displaySize  = Math.round(overrideSize ?? computedSize);

  const currentAlign = cur["text-align"] || picked.computedStyles["text-align"] || "left";
  const computedWeight = parseFloat(picked.computedStyles["font-weight"] ?? "400");
  const isBold = cur["font-weight"]
    ? cur["font-weight"] === "700" || cur["font-weight"] === "bold"
    : computedWeight >= 600;

  function setAlign(a: string) {
    onOverride(sel, "text-align", cur["text-align"] === a ? "" : a);
  }
  function adjustSize(delta: number) {
    onOverride(sel, "font-size", `${Math.max(8, Math.min(128, displaySize + delta))}px`);
  }
  function toggleBold() {
    onOverride(sel, "font-weight", cur["font-weight"] ? "" : "700");
  }

  return (
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 1,
        background: "#11111A",
        border: "1px solid rgba(166,124,255,0.3)",
        borderRadius: 9,
        boxShadow: "0 8px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(166,124,255,0.07)",
        padding: "3px 5px",
        userSelect: "none",
        pointerEvents: "all",
      }}
    >
      {/* tag */}
      <span style={{
        fontSize: 9, fontFamily: "monospace", color: "#55526A",
        padding: "0 8px 0 4px", letterSpacing: "0.06em",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        whiteSpace: "nowrap",
      }}>
        {picked.tagName}
      </span>

      {/* text align */}
      {(["left", "center", "right"] as const).map((a) => (
        <FBtn key={a} active={currentAlign === a} title={a === "left" ? "Esquerda" : a === "center" ? "Centro" : "Direita"} onClick={() => setAlign(a)}>
          <AlignSvg type={a} />
        </FBtn>
      ))}

      <Sep />

      {/* font size */}
      <FBtn onClick={() => adjustSize(-2)} title="Diminuir fonte">
        <span style={{ fontSize: 14, lineHeight: 1, fontWeight: 300 }}>−</span>
      </FBtn>
      <span style={{
        fontSize: 11, color: "#C4BFDE", minWidth: 30, textAlign: "center",
        fontVariantNumeric: "tabular-nums", letterSpacing: "0",
      }}>
        {displaySize}
      </span>
      <FBtn onClick={() => adjustSize(2)} title="Aumentar fonte">
        <span style={{ fontSize: 14, lineHeight: 1, fontWeight: 300 }}>+</span>
      </FBtn>

      <Sep />

      {/* bold */}
      <FBtn active={isBold} title="Negrito (B)" onClick={toggleBold}>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "serif" }}>B</span>
      </FBtn>

      <Sep />

      {/* close */}
      <FBtn onClick={onClose} title="Fechar (Esc)">
        <span style={{ fontSize: 10, color: "#55526A" }}>✕</span>
      </FBtn>
    </div>
  );
}

/* ── sub-components ─────────────────────────────── */
function Sep() {
  return <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.07)", margin: "0 3px", flexShrink: 0 }} />;
}

function FBtn({ children, onClick, active, title }: {
  children: React.ReactNode; onClick: () => void; active?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? "rgba(166,124,255,0.18)" : "transparent",
        border: `1px solid ${active ? "rgba(166,124,255,0.4)" : "transparent"}`,
        borderRadius: 5,
        color: active ? "#A67CFF" : "#8E8AA8",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        height: 26, minWidth: 26, padding: "0 5px",
        transition: "background 0.1s, color 0.1s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function AlignSvg({ type }: { type: "left" | "center" | "right" }) {
  const rows: Array<{ w: number; x: number }> = type === "left"
    ? [{ w: 10, x: 0 }, { w: 7, x: 0 }, { w: 10, x: 0 }]
    : type === "center"
    ? [{ w: 10, x: 0 }, { w: 7, x: 1.5 }, { w: 10, x: 0 }]
    : [{ w: 10, x: 0 }, { w: 7, x: 3 }, { w: 10, x: 0 }];
  return (
    <svg width="10" height="9" viewBox="0 0 10 9" fill="currentColor">
      {rows.map((r, i) => (
        <rect key={i} x={r.x} y={i * 3} width={r.w} height={1.5} rx={0.75} />
      ))}
    </svg>
  );
}
