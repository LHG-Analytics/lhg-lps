"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { DeviceFrame, type Device } from "./DeviceFrame";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/* ── tipos ─────────────────────────────────────────── */
type EditorTab = "visual" | "code";
type Block = { type: string; props: Record<string, unknown> };

const BLOCK_ICON: Record<string, string> = {
  nav: "🔝", hero: "🎯", benefits: "✨", unitPicker: "🛏",
  offer: "💰", faq: "❓", footer: "🔚", stickyCta: "📌",
};

const BLOCK_SOURCE: Record<string, { file: string; line: number }> = {
  nav:        { file: "components/blocks/Nav.tsx", line: 1 },
  hero:       { file: "components/blocks/Hero.tsx", line: 1 },
  benefits:   { file: "components/blocks/Benefits.tsx", line: 1 },
  unitPicker: { file: "components/blocks/UnitPicker.tsx", line: 1 },
  offer:      { file: "components/blocks/Offer.tsx", line: 1 },
  faq:        { file: "components/blocks/FAQ.tsx", line: 1 },
  footer:     { file: "components/blocks/Footer.tsx", line: 1 },
  stickyCta:  { file: "components/blocks/StickyCta.tsx", line: 1 },
};

/* ── props ─────────────────────────────────────────── */
interface Props {
  campaignId: string;
  brandId: string;
  slug: string;
  initialBlocks: Block[];
  status: string;
}

/* ═══════════════════════════════════════════════════ */
export function CampaignEditor({ campaignId, brandId, slug, initialBlocks, status }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx]   = useState<number | null>(null);
  const [tab, setTab]         = useState<EditorTab>("visual");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [device, setDevice]   = useState<Device>("desktop");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedBlock = selectedIdx !== null ? blocks[selectedIdx] ?? null : null;

  /* ── postMessage from iframe ─────────────────────── */
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "block-hover") setHoveredIdx(e.data.blockIndex ?? null);
      if (e.data?.type === "block-click") {
        setSelectedIdx(e.data.blockIndex ?? null);
        setDrawerOpen(true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /* ── tell iframe which block is selected ─────────── */
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "select-block", blockIndex: selectedIdx },
      "*"
    );
  }, [selectedIdx]);

  /* ── auto-save debounced ─────────────────────────── */
  const save = useCallback(async (b: Block[], publish?: boolean) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: b, ...(publish ? { status: "published" } : {}) }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setPreviewKey((k) => k + 1);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }, [campaignId]);

  function scheduleAutoSave(b: Block[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(b), 1500);
  }

  function updateBlocks(next: Block[]) {
    setBlocks(next);
    scheduleAutoSave(next);
  }

  /* ── block list actions ──────────────────────────── */
  function moveBlock(idx: number, dir: -1 | 1) {
    const next = [...blocks];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap]!, next[idx]!];
    if (selectedIdx === idx) setSelectedIdx(swap);
    updateBlocks(next);
  }

  function deleteBlock(idx: number) {
    const next = blocks.filter((_, i) => i !== idx);
    if (selectedIdx === idx) { setSelectedIdx(null); setDrawerOpen(false); }
    else if (selectedIdx !== null && selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
    updateBlocks(next);
  }

  function addBlock(type: string) {
    const newBlock: Block = { type, props: {} };
    const next = [...blocks, newBlock];
    setBlocks(next);
    setSelectedIdx(next.length - 1);
    setDrawerOpen(true);
    scheduleAutoSave(next);
  }

  /* ── block prop update (Visual mode) ────────────── */
  function updateBlockProp(path: string[], value: unknown) {
    if (selectedIdx === null) return;
    const next = blocks.map((b, i) => {
      if (i !== selectedIdx) return b;
      const props = deepSet({ ...b.props }, path, value);
      return { ...b, props };
    });
    updateBlocks(next);
  }

  /* ── block JSON update (Code mode) ──────────────── */
  function updateBlockJson(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr) as Block;
      const next = blocks.map((b, i) => i === selectedIdx ? parsed : b);
      updateBlocks(next);
    } catch { /* invalid JSON while typing */ }
  }

  /* ════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#0D0D12", overflow: "hidden" }}>

      {/* ── HEADER ──────────────────────────────────── */}
      <header style={{
        height: 48, borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0,
      }}>
        <Link href="/admin/campaigns" style={{ color: "#55526A", fontSize: 12, textDecoration: "none" }}>← Campanhas</Link>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
        <span style={{ fontSize: 13, color: "#F0EEF8", fontWeight: 600 }}>{slug}</span>
        <span style={{ fontSize: 11, color: "#55526A" }}>{brandId}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
          background: status === "published" ? "rgba(46,184,122,0.15)" : "rgba(142,138,168,0.15)",
          color: status === "published" ? "#2EB87A" : "#8E8AA8",
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>{status}</span>

        <div style={{ flex: 1 }} />

        {error && <span style={{ fontSize: 11, color: "#E05260", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{error}</span>}
        {saved && <span style={{ fontSize: 11, color: "#2EB87A" }}>✓ Salvo</span>}
        {saving && <span style={{ fontSize: 11, color: "#8E8AA8" }}>Salvando…</span>}

        <button
          onClick={() => save(blocks, true)}
          disabled={saving}
          style={{ background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          Publicar
        </button>
      </header>

      {/* ── BODY ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── LEFT: LAYERS ──────────────────────────── */}
        <aside style={{
          width: 220, borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          <div style={{ padding: "10px 12px 6px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#55526A" }}>
            Blocos · {blocks.length}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
            {blocks.map((block, i) => (
              <div
                key={i}
                onClick={() => { setSelectedIdx(i); setDrawerOpen(true); iframeRef.current?.contentWindow?.postMessage({ type: "select-block", blockIndex: i }, "*"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 8px",
                  borderRadius: 7, cursor: "pointer", marginBottom: 2,
                  background: selectedIdx === i ? "rgba(166,124,255,0.15)" : hoveredIdx === i ? "rgba(255,255,255,0.04)" : "transparent",
                  border: `1px solid ${selectedIdx === i ? "rgba(166,124,255,0.4)" : "transparent"}`,
                  transition: "background 0.1s",
                }}
              >
                <span style={{ fontSize: 14 }}>{BLOCK_ICON[block.type] ?? "📦"}</span>
                <span style={{ fontSize: 12, color: selectedIdx === i ? "#A67CFF" : "#F0EEF8", fontWeight: 500, flex: 1 }}>{block.type}</span>
                <div style={{ display: "flex", gap: 2, opacity: 0.5 }}>
                  <Btn onClick={(e) => { e.stopPropagation(); moveBlock(i, -1); }}>↑</Btn>
                  <Btn onClick={(e) => { e.stopPropagation(); moveBlock(i, 1); }}>↓</Btn>
                  <Btn onClick={(e) => { e.stopPropagation(); deleteBlock(i); }} danger>✕</Btn>
                </div>
              </div>
            ))}
          </div>

          {/* Add block */}
          <div style={{ padding: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "#55526A", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Adicionar bloco</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Object.keys(BLOCK_ICON).map((type) => (
                <button key={type} onClick={() => addBlock(type)} style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 5, padding: "3px 7px", fontSize: 10, color: "#8E8AA8",
                  cursor: "pointer", transition: "background 0.12s",
                }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(166,124,255,0.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}>
                  {BLOCK_ICON[type]} {type}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── RIGHT: PREVIEW + DRAWER ───────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Device toolbar */}
          <div style={{
            height: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
          }}>
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
              <button key={d} onClick={() => setDevice(d)} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "4px 12px",
                borderRadius: 6, border: "none", cursor: "pointer",
                background: device === d ? "rgba(166,124,255,0.18)" : "transparent",
                color: device === d ? "#A67CFF" : "#55526A",
                fontSize: 11, fontWeight: 600, transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 13 }}>
                  {d === "desktop" ? "🖥" : d === "tablet" ? "⊡" : "📱"}
                </span>
                {d === "desktop" ? "Desktop" : d === "tablet" ? "Tablet" : "Mobile"}
              </button>
            ))}
          </div>

          {/* iframe wrapped in device frame */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
            <DeviceFrame device={device}>
              <iframe
                ref={iframeRef}
                key={previewKey}
                src={`/admin/preview/${brandId}/${slug}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Preview ao vivo"
              />
            </DeviceFrame>
            {!drawerOpen && (
              <div style={{
                position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
                background: "rgba(13,13,18,0.9)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20, padding: "6px 16px", fontSize: 11, color: "#8E8AA8",
                pointerEvents: "none", zIndex: 10,
              }}>
                Clique em qualquer bloco para editar
              </div>
            )}
          </div>

          {/* ── DRAWER ──────────────────────────────── */}
          {drawerOpen && selectedBlock && (
            <div style={{
              height: 380, borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex", flexDirection: "column", flexShrink: 0,
              background: "#0D0D12",
            }}>
              {/* Drawer header */}
              <div style={{
                height: 44, display: "flex", alignItems: "center",
                padding: "0 16px", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 16 }}>{BLOCK_ICON[selectedBlock.type] ?? "📦"}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F0EEF8" }}>{selectedBlock.type}</span>

                {/* File badge */}
                {BLOCK_SOURCE[selectedBlock.type] && (
                  <span style={{
                    fontSize: 10, color: "#55526A", fontFamily: "monospace",
                    background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4,
                  }}>
                    {BLOCK_SOURCE[selectedBlock.type]!.file}
                  </span>
                )}

                <div style={{ flex: 1 }} />

                {/* Tab switcher */}
                <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: 2 }}>
                  {(["visual", "code"] as EditorTab[]).map((t) => (
                    <button key={t} onClick={() => setTab(t)} style={{
                      padding: "4px 12px", borderRadius: 4, border: "none",
                      background: tab === t ? "#1E1E2A" : "transparent",
                      color: tab === t ? "#A67CFF" : "#55526A",
                      fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}>
                      {t === "visual" ? "✦ Visual" : "</> Código"}
                    </button>
                  ))}
                </div>

                <button onClick={() => { setDrawerOpen(false); setSelectedIdx(null); }} style={{
                  background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 16, padding: 4,
                }}>✕</button>
              </div>

              {/* Drawer content */}
              <div style={{ flex: 1, overflow: "auto" }}>
                {tab === "visual" ? (
                  <div style={{ padding: 16 }}>
                    <PropForm
                      data={selectedBlock.props}
                      path={[]}
                      onChange={(path, val) => updateBlockProp(path, val)}
                    />
                  </div>
                ) : (
                  <MonacoEditor
                    height="100%"
                    defaultLanguage="json"
                    theme="vs-dark"
                    value={JSON.stringify(selectedBlock, null, 2)}
                    onChange={(v) => updateBlockJson(v ?? "")}
                    options={{ fontSize: 12, minimap: { enabled: false }, wordWrap: "on", tabSize: 2, scrollBeyondLastLine: false }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── PropForm: renderiza campos a partir do JSON ──── */
function PropForm({
  data, path, onChange,
}: {
  data: Record<string, unknown>;
  path: string[];
  onChange: (path: string[], val: unknown) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Object.entries(data).map(([key, val]) => {
        const fullPath = [...path, key];
        return (
          <div key={key}>
            <label style={{ fontSize: 11, color: "#8E8AA8", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{key}</label>
            {typeof val === "string" && val.length > 80 ? (
              <textarea
                value={val}
                onChange={(e) => onChange(fullPath, e.target.value)}
                style={fieldStyle}
                rows={3}
              />
            ) : typeof val === "string" ? (
              <input type="text" value={val} onChange={(e) => onChange(fullPath, e.target.value)} style={fieldStyle} />
            ) : typeof val === "number" ? (
              <input type="number" value={val} onChange={(e) => onChange(fullPath, Number(e.target.value))} style={fieldStyle} />
            ) : typeof val === "boolean" ? (
              <input type="checkbox" checked={val} onChange={(e) => onChange(fullPath, e.target.checked)} />
            ) : Array.isArray(val) ? (
              <div style={{ fontSize: 11, color: "#55526A", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                Array · {val.length} itens — edite via Código
              </div>
            ) : typeof val === "object" && val !== null ? (
              <div style={{ paddingLeft: 12, borderLeft: "2px solid rgba(255,255,255,0.06)" }}>
                <PropForm data={val as Record<string, unknown>} path={fullPath} onChange={onChange} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ── utils ──────────────────────────────────────────── */
const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "7px 10px", color: "#F0EEF8", fontSize: 13, outline: "none",
  fontFamily: "inherit", resize: "vertical",
};

function Btn({ children, onClick, danger }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", cursor: "pointer",
      color: danger ? "#E05260" : "#55526A", fontSize: 11, padding: "1px 3px",
    }}>{children}</button>
  );
}

function deepSet(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  if (path.length === 0) return obj;
  const [key, ...rest] = path;
  if (!key) return obj;
  return {
    ...obj,
    [key]: rest.length === 0 ? value : deepSet((obj[key] as Record<string, unknown>) ?? {}, rest, value),
  };
}
