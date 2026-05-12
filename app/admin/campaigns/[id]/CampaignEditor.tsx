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
  const [blocks, setBlocks]             = useState<Block[]>(initialBlocks);
  const [publishedBlocks, setPublishedBlocks] = useState<Block[]>(initialBlocks);
  const [selectedIdx, setSelectedIdx]   = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx]     = useState<number | null>(null);
  const [tab, setTab]                   = useState<EditorTab>("visual");
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [drawerHeight, setDrawerHeight]   = useState(220);
  const [device, setDevice]             = useState<Device>("desktop");
  const [zoom, setZoom]                 = useState(1);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const iframeRef  = useRef<HTMLIFrameElement>(null);
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef    = useRef<{ startY: number; startH: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoRef  = useRef<any>(null);

  const selectedBlock = selectedIdx !== null ? blocks[selectedIdx] ?? null : null;
  const isDirty = JSON.stringify(blocks) !== JSON.stringify(publishedBlocks);

  /* ── postMessage bidireccional com o iframe ─────── */
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "block-hover") setHoveredIdx(e.data.blockIndex ?? null);
      if (e.data?.type === "block-click") {
        setSelectedIdx(e.data.blockIndex ?? null);
        setDrawerOpen(true);
      }
      // Iframe sinalizou que está pronto → envia estado atual
      if (e.data?.type === "preview-ready") {
        sendToPreview(blocks);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  function sendToPreview(b: Block[]) {
    iframeRef.current?.contentWindow?.postMessage({ type: "update-blocks", blocks: b }, "*");
  }

  /* ── tell iframe which block is selected ─────────── */
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "select-block", blockIndex: selectedIdx },
      "*"
    );
  }, [selectedIdx]);

  /* ── save / publish ──────────────────────────────── */
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
      if (publish) setPublishedBlocks(b);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }, [campaignId]);

  function scheduleAutoSave(b: Block[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(b), 2000);
  }

  function updateBlocks(next: Block[]) {
    setBlocks(next);
    sendToPreview(next);
    scheduleAutoSave(next);
  }

  // Monaco não relayout automaticamente quando o container redimensiona via drag
  useEffect(() => {
    monacoRef.current?.layout();
  }, [drawerHeight]);

  function onDividerMouseDown(e: React.MouseEvent) {
    dragRef.current = { startY: e.clientY, startH: drawerHeight };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - ev.clientY; // arrastar pra cima → maior
      setDrawerHeight(Math.max(80, Math.min(window.innerHeight - 160, dragRef.current.startH + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function discardChanges() {
    setBlocks(publishedBlocks);
    sendToPreview(publishedBlocks);
    if (selectedIdx !== null) { setSelectedIdx(null); setDrawerOpen(false); }
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

        {error && <span style={{ fontSize: 11, color: "#E05260", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{error}</span>}
        {saved && <span style={{ fontSize: 11, color: "#2EB87A" }}>✓ Publicado</span>}
        {saving && <span style={{ fontSize: 11, color: "#8E8AA8" }}>Salvando…</span>}
        {isDirty && !saving && !saved && (
          <span style={{ fontSize: 11, color: "#F0A84A" }}>● Alterações não publicadas</span>
        )}

        <button
          onClick={discardChanges}
          disabled={!isDirty || saving}
          style={{
            background: "transparent", color: isDirty ? "#8E8AA8" : "#3A3850",
            border: `1px solid ${isDirty ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}`,
            borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600,
            cursor: isDirty ? "pointer" : "default", transition: "all 0.15s",
          }}
        >
          Descartar
        </button>

        <button
          onClick={() => save(blocks, true)}
          disabled={saving || !isDirty}
          style={{
            background: isDirty ? "#A67CFF" : "#3A2E60",
            color: isDirty ? "#fff" : "#55526A",
            border: "none", borderRadius: 6, padding: "6px 16px",
            fontSize: 12, fontWeight: 700,
            cursor: isDirty ? "pointer" : "default", transition: "all 0.2s",
          }}
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

          {/* Device + zoom toolbar */}
          <div style={{
            height: 40, display: "flex", alignItems: "center", gap: 4, padding: "0 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
          }}>
            {/* Device toggles */}
            <div style={{ display: "flex", gap: 2 }}>
              {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
                <button key={d} onClick={() => setDevice(d)} title={d === "desktop" ? "Desktop (1280px)" : d === "tablet" ? "Tablet (820px)" : "Mobile (393px)"} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
                  borderRadius: 6, border: "none", cursor: "pointer",
                  background: device === d ? "rgba(166,124,255,0.18)" : "transparent",
                  color: device === d ? "#A67CFF" : "#55526A",
                  fontSize: 11, fontWeight: 600, transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 12 }}>
                    {d === "desktop" ? "🖥" : d === "tablet" ? "⊡" : "📱"}
                  </span>
                  {d === "desktop" ? "Desktop" : d === "tablet" ? "Tablet" : "Mobile"}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />

            {/* Zoom controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                onClick={() => setZoom((z) => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))))}
                disabled={zoom <= 0.25}
                style={{ background: "none", border: "none", color: zoom <= 0.25 ? "#2A2838" : "#55526A", cursor: zoom <= 0.25 ? "default" : "pointer", fontSize: 14, padding: "2px 6px", lineHeight: 1 }}
              >−</button>
              <button
                onClick={() => setZoom(1)}
                title="Resetar zoom"
                style={{
                  background: zoom !== 1 ? "rgba(166,124,255,0.12)" : "transparent",
                  border: "none", borderRadius: 4, padding: "3px 8px",
                  color: zoom !== 1 ? "#A67CFF" : "#55526A",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", minWidth: 44,
                }}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(2, parseFloat((z + 0.25).toFixed(2))))}
                disabled={zoom >= 2}
                style={{ background: "none", border: "none", color: zoom >= 2 ? "#2A2838" : "#55526A", cursor: zoom >= 2 ? "default" : "pointer", fontSize: 14, padding: "2px 6px", lineHeight: 1 }}
              >+</button>
            </div>

            <div style={{ flex: 1 }} />

            {/* Abrir em nova aba */}
            <a
              href={`/admin/preview/${brandId}/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir preview em nova aba"
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
                borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)",
                color: "#55526A", fontSize: 11, fontWeight: 600,
                textDecoration: "none", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#F0EEF8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#55526A"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <span style={{ fontSize: 11 }}>↗</span> Nova aba
            </a>
          </div>

          {/* iframe wrapped in device frame */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
            <DeviceFrame device={device} zoom={zoom}>
              <iframe
                ref={iframeRef}
                src={`/admin/preview/${brandId}/${slug}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Preview ao vivo"
                onLoad={() => sendToPreview(blocks)}
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
          {/* ── DIVIDER arrastável ──────────────────── */}
          {drawerOpen && selectedBlock && (
            <div
              onMouseDown={onDividerMouseDown}
              style={{
                height: 10, flexShrink: 0, cursor: "ns-resize",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                userSelect: "none",
              }}
            >
              <div style={{ display: "flex", gap: 3 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
                ))}
              </div>
            </div>
          )}

          {/* ── DRAWER — position:relative garante inset preciso ── */}
          {drawerOpen && selectedBlock && (
            <div style={{
              height: drawerHeight, flexShrink: 0,
              position: "relative", overflow: "hidden",
              background: "#0D0D12",
            }}>
              {/* Header — ancorado ao topo */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 44,
                display: "flex", alignItems: "center", padding: "0 12px", gap: 10,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "#0D0D12", zIndex: 1,
              }}>
                <span style={{ fontSize: 15 }}>{BLOCK_ICON[selectedBlock.type] ?? "📦"}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F0EEF8" }}>{selectedBlock.type}</span>
                {BLOCK_SOURCE[selectedBlock.type] && (
                  <span style={{
                    fontSize: 10, color: "#55526A", fontFamily: "monospace",
                    background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4,
                  }}>
                    {BLOCK_SOURCE[selectedBlock.type]!.file}
                  </span>
                )}
                <div style={{ flex: 1 }} />
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
                  background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 14, padding: "4px 6px",
                }}>✕</button>
              </div>

              {/* Visual */}
              {tab === "visual" && (
                <div style={{
                  position: "absolute", top: 44, left: 0, right: 0, bottom: 0,
                  overflow: "auto", padding: 16,
                }}>
                  <PropForm
                    data={selectedBlock.props}
                    path={[]}
                    onChange={(path, val) => updateBlockProp(path, val)}
                  />
                </div>
              )}

              {tab === "code" && (
                <>
                <style>{`.lhg-code section { padding-top: 0 !important; padding-bottom: 10px !important; }`}</style>
                <div className="lhg-code" style={{
                  position: "absolute", left: 0, right: 0, top: 0,
                  height: drawerHeight,
                  overflow: "hidden",
                }}>
                  <MonacoEditor
                    height={drawerHeight}
                    width="100%"
                    defaultLanguage="json"
                    theme="vs-dark"
                    value={JSON.stringify(selectedBlock, null, 2)}
                    onChange={(v) => updateBlockJson(v ?? "")}
                    onMount={(editor) => {
                      monacoRef.current = editor;
                      requestAnimationFrame(() => editor.layout());
                    }}
                    options={{
                      automaticLayout: true,
                      fontSize: 13, minimap: { enabled: false },
                      wordWrap: "on", tabSize: 2,
                      scrollBeyondLastLine: false,
                      padding: { top: 0, bottom: 10 },
                    }}
                  />
                </div>
                </>
              )}
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
