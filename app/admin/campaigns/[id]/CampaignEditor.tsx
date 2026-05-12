"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { DeviceFrame, type Device } from "./DeviceFrame";
import { SortableBlockItem, BLOCK_ICON } from "./SortableBlockItem";
import { ThemePanel, type Theme } from "./ThemePanel";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/* ── tipos ─────────────────────────────────────────── */
type EditorTab  = "visual" | "code";
type SidebarTab = "blocks" | "theme";
type Block      = { type: string; props: Record<string, unknown> };

const BLOCK_SOURCE: Record<string, string> = {
  nav: "components/blocks/Nav.tsx", hero: "components/blocks/Hero.tsx",
  benefits: "components/blocks/Benefits.tsx", unitPicker: "components/blocks/UnitPicker.tsx",
  offer: "components/blocks/Offer.tsx", faq: "components/blocks/FAQ.tsx",
  footer: "components/blocks/Footer.tsx", stickyCta: "components/blocks/StickyCta.tsx",
};

const MEDIA_KEY = /image|img|src|video|poster|photo|thumb|media|bg/i;

/* ── props ─────────────────────────────────────────── */
interface Props {
  campaignId: string;
  brandId: string;
  slug: string;
  initialBlocks: Block[];
  initialTheme: Record<string, string>;
  status: string;
}

/* ═══════════════════════════════════════════════════ */
export function CampaignEditor({ campaignId, brandId, slug, initialBlocks, initialTheme, status }: Props) {
  const [blocks, setBlocks]                   = useState<Block[]>(initialBlocks);
  const [publishedBlocks, setPublishedBlocks] = useState<Block[]>(initialBlocks);
  const [selectedIdx, setSelectedIdx]         = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx]           = useState<number | null>(null);
  const [tab, setTab]                         = useState<EditorTab>("visual");
  const [sidebarTab, setSidebarTab]           = useState<SidebarTab>("blocks");
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [drawerHeight, setDrawerHeight]       = useState(220);
  const [device, setDevice]                   = useState<Device>("desktop");
  const [zoom, setZoom]                       = useState(1);
  const [saving, setSaving]                   = useState(false);
  const [saved, setSaved]                     = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [theme, setTheme]                     = useState<Theme>(initialTheme);
  const [themeSaving, setThemeSaving]         = useState(false);
  const [canUndo, setCanUndo]                 = useState(false);
  const [canRedo, setCanRedo]                 = useState(false);

  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const divDragRef  = useRef<{ startY: number; startH: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoRef   = useRef<any>(null);

  // ── história de undo/redo via refs (sem stale closure)
  const histRef = useRef({ stack: [initialBlocks] as Block[][], idx: 0 });

  function pushHistory(b: Block[]) {
    const h = histRef.current;
    h.stack = [...h.stack.slice(0, h.idx + 1), b].slice(-60);
    h.idx   = h.stack.length - 1;
    setCanUndo(h.idx > 0);
    setCanRedo(false);
  }

  const selectedBlock = selectedIdx !== null ? blocks[selectedIdx] ?? null : null;
  const isDirty = JSON.stringify(blocks) !== JSON.stringify(publishedBlocks);

  // DnD sensors — requer 5px de movimento para não conflitar com onClick
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /* ── iframe postMessage ─────────────────────────── */
  function sendToPreview(b: Block[]) {
    iframeRef.current?.contentWindow?.postMessage({ type: "update-blocks", blocks: b }, "*");
  }
  function sendThemeToPreview(t: Theme) {
    iframeRef.current?.contentWindow?.postMessage({ type: "update-theme", theme: t }, "*");
  }

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "block-hover") setHoveredIdx(e.data.blockIndex ?? null);
      if (e.data?.type === "block-click") { setSelectedIdx(e.data.blockIndex ?? null); setDrawerOpen(true); }
      if (e.data?.type === "preview-ready") { sendToPreview(blocks); sendThemeToPreview(theme); }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, theme]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "select-block", blockIndex: selectedIdx }, "*");
  }, [selectedIdx]);

  /* ── undo / redo ────────────────────────────────── */
  const undoFn = useCallback(() => {
    const h = histRef.current;
    if (h.idx <= 0) return;
    h.idx--;
    const b = h.stack[h.idx]!;
    setBlocks(b);
    iframeRef.current?.contentWindow?.postMessage({ type: "update-blocks", blocks: b }, "*");
    setCanUndo(h.idx > 0);
    setCanRedo(true);
  }, []);

  const redoFn = useCallback(() => {
    const h = histRef.current;
    if (h.idx >= h.stack.length - 1) return;
    h.idx++;
    const b = h.stack[h.idx]!;
    setBlocks(b);
    iframeRef.current?.contentWindow?.postMessage({ type: "update-blocks", blocks: b }, "*");
    setCanUndo(true);
    setCanRedo(h.idx < h.stack.length - 1);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undoFn(); }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redoFn(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [undoFn, redoFn]);

  /* ── save / publish ─────────────────────────────── */
  const save = useCallback(async (b: Block[], publish?: boolean) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: b, ...(publish ? { status: "published" } : {}) }),
      });
      if (!res.ok) throw new Error(await res.text());
      if (publish) setPublishedBlocks(b);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  }, [campaignId]);

  function scheduleAutoSave(b: Block[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(b), 2000);
  }

  function updateBlocks(next: Block[]) {
    pushHistory(next);
    setBlocks(next);
    sendToPreview(next);
    scheduleAutoSave(next);
  }

  async function saveTheme() {
    setThemeSaving(true);
    try {
      const res = await fetch(`/api/admin/brands/${brandId}/theme`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar tema.");
    } finally { setThemeSaving(false); }
  }

  function updateTheme(t: Theme) {
    setTheme(t);
    sendThemeToPreview(t);
  }

  /* ── drawer resize ──────────────────────────────── */
  useEffect(() => { monacoRef.current?.layout(); }, [drawerHeight]);

  function onDividerMouseDown(e: React.MouseEvent) {
    divDragRef.current = { startY: e.clientY, startH: drawerHeight };
    const onMove = (ev: MouseEvent) => {
      if (!divDragRef.current) return;
      const delta = divDragRef.current.startY - ev.clientY;
      setDrawerHeight(Math.max(80, Math.min(window.innerHeight - 160, divDragRef.current.startH + delta)));
    };
    const onUp = () => {
      divDragRef.current = null;
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

  /* ── block actions ──────────────────────────────── */
  function deleteBlock(idx: number) {
    const next = blocks.filter((_, i) => i !== idx);
    if (selectedIdx === idx) { setSelectedIdx(null); setDrawerOpen(false); }
    else if (selectedIdx !== null && selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
    updateBlocks(next);
  }

  function duplicateBlock(idx: number) {
    const clone = JSON.parse(JSON.stringify(blocks[idx])) as Block;
    const next = [...blocks.slice(0, idx + 1), clone, ...blocks.slice(idx + 1)];
    setSelectedIdx(idx + 1);
    setDrawerOpen(true);
    updateBlocks(next);
  }

  function addBlock(type: string) {
    const next = [...blocks, { type, props: {} }];
    setSelectedIdx(next.length - 1);
    setDrawerOpen(true);
    updateBlocks(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = Number(active.id);
    const newIdx = Number(over.id);
    const next = arrayMove(blocks, oldIdx, newIdx);
    if (selectedIdx !== null) {
      if (selectedIdx === oldIdx) setSelectedIdx(newIdx);
      else if (oldIdx < newIdx && selectedIdx > oldIdx && selectedIdx <= newIdx) setSelectedIdx(selectedIdx - 1);
      else if (oldIdx > newIdx && selectedIdx >= newIdx && selectedIdx < oldIdx) setSelectedIdx(selectedIdx + 1);
    }
    updateBlocks(next);
  }

  /* ── prop updates ───────────────────────────────── */
  function updateBlockProp(path: string[], value: unknown) {
    if (selectedIdx === null) return;
    const next = blocks.map((b, i) =>
      i !== selectedIdx ? b : { ...b, props: deepSet({ ...b.props }, path, value) }
    );
    updateBlocks(next);
  }

  function updateBlockJson(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr) as Block;
      updateBlocks(blocks.map((b, i) => i === selectedIdx ? parsed : b));
    } catch { /* JSON inválido enquanto digita */ }
  }

  /* ════════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#0D0D12", overflow: "hidden" }}>

      {/* ── HEADER ──────────────────────────────────── */}
      <header style={{ height: 48, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
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

        {/* Undo / Redo */}
        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={undoFn} disabled={!canUndo} title="Desfazer (Ctrl+Z)" style={undoRedoBtn(canUndo)}>↩</button>
          <button onClick={redoFn} disabled={!canRedo} title="Refazer (Ctrl+Y)" style={undoRedoBtn(canRedo)}>↪</button>
        </div>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

        {error  && <span style={{ fontSize: 11, color: "#E05260", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{error}</span>}
        {saved  && <span style={{ fontSize: 11, color: "#2EB87A" }}>✓ Publicado</span>}
        {saving && <span style={{ fontSize: 11, color: "#8E8AA8" }}>Salvando…</span>}
        {isDirty && !saving && !saved && <span style={{ fontSize: 11, color: "#F0A84A" }}>● Não publicado</span>}

        <button onClick={discardChanges} disabled={!isDirty || saving} style={{
          background: "transparent", color: isDirty ? "#8E8AA8" : "#3A3850",
          border: `1px solid ${isDirty ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"}`,
          borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600,
          cursor: isDirty ? "pointer" : "default",
        }}>Descartar</button>

        <button onClick={() => save(blocks, true)} disabled={saving || !isDirty} style={{
          background: isDirty ? "#A67CFF" : "#3A2E60", color: isDirty ? "#fff" : "#55526A",
          border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 700,
          cursor: isDirty ? "pointer" : "default",
        }}>Publicar</button>
      </header>

      {/* ── BODY ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── SIDEBAR ──────────────────────────────── */}
        <aside style={{ width: 220, borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", flexShrink: 0 }}>

          {/* Sidebar tab toggle */}
          <div style={{ display: "flex", padding: "8px 8px 0", gap: 4 }}>
            {(["blocks","theme"] as SidebarTab[]).map((t) => (
              <button key={t} onClick={() => setSidebarTab(t)} style={{
                flex: 1, padding: "6px 0", border: "none", borderRadius: 6,
                background: sidebarTab === t ? "rgba(166,124,255,0.18)" : "transparent",
                color: sidebarTab === t ? "#A67CFF" : "#55526A",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {t === "blocks" ? `Blocos · ${blocks.length}` : "🎨 Tema"}
              </button>
            ))}
          </div>

          {sidebarTab === "blocks" ? (
            <>
              {/* Block list with DnD */}
              <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={blocks.map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
                    {blocks.map((block, i) => (
                      <SortableBlockItem
                        key={i}
                        id={String(i)}
                        block={block}
                        selected={selectedIdx === i}
                        hovered={hoveredIdx === i}
                        onSelect={() => {
                          setSelectedIdx(i); setDrawerOpen(true);
                          iframeRef.current?.contentWindow?.postMessage({ type: "select-block", blockIndex: i }, "*");
                        }}
                        onDuplicate={() => duplicateBlock(i)}
                        onDelete={() => deleteBlock(i)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              {/* Add block */}
              <div style={{ padding: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, color: "#55526A", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Adicionar bloco</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {Object.keys(BLOCK_ICON).map((type) => (
                    <button key={type} onClick={() => addBlock(type)} style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 5, padding: "3px 7px", fontSize: 10, color: "#8E8AA8", cursor: "pointer",
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(166,124,255,0.15)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    >
                      {BLOCK_ICON[type]} {type}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <ThemePanel theme={theme} onChange={updateTheme} saving={themeSaving} onSave={saveTheme} />
          )}
        </aside>

        {/* ── RIGHT: PREVIEW + DRAWER ──────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Device + zoom toolbar */}
          <div style={{ height: 40, display: "flex", alignItems: "center", gap: 4, padding: "0 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 2 }}>
              {(["desktop","tablet","mobile"] as Device[]).map((d) => (
                <button key={d} onClick={() => setDevice(d)} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
                  borderRadius: 6, border: "none", cursor: "pointer",
                  background: device === d ? "rgba(166,124,255,0.18)" : "transparent",
                  color: device === d ? "#A67CFF" : "#55526A", fontSize: 11, fontWeight: 600,
                }}>
                  <span style={{ fontSize: 12 }}>{d === "desktop" ? "🖥" : d === "tablet" ? "⊡" : "📱"}</span>
                  {d === "desktop" ? "Desktop" : d === "tablet" ? "Tablet" : "Mobile"}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button onClick={() => setZoom((z) => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))))} disabled={zoom <= 0.25}
                style={{ background: "none", border: "none", color: zoom <= 0.25 ? "#2A2838" : "#55526A", cursor: zoom <= 0.25 ? "default" : "pointer", fontSize: 14, padding: "2px 6px" }}>−</button>
              <button onClick={() => setZoom(1)} style={{ background: zoom !== 1 ? "rgba(166,124,255,0.12)" : "transparent", border: "none", borderRadius: 4, padding: "3px 8px", color: zoom !== 1 ? "#A67CFF" : "#55526A", fontSize: 11, fontWeight: 600, cursor: "pointer", minWidth: 44 }}>
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={() => setZoom((z) => Math.min(2, parseFloat((z + 0.25).toFixed(2))))} disabled={zoom >= 2}
                style={{ background: "none", border: "none", color: zoom >= 2 ? "#2A2838" : "#55526A", cursor: zoom >= 2 ? "default" : "pointer", fontSize: 14, padding: "2px 6px" }}>+</button>
            </div>
            <div style={{ flex: 1 }} />
            <a href={`/admin/preview/${brandId}/${slug}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", color: "#55526A", fontSize: 11, fontWeight: 600, textDecoration: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#F0EEF8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#55526A"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >↗ Nova aba</a>
          </div>

          {/* Device frame + iframe */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
            <DeviceFrame device={device} zoom={zoom}>
              <iframe
                ref={iframeRef}
                src={`/admin/preview/${brandId}/${slug}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Preview ao vivo"
                onLoad={() => { sendToPreview(blocks); sendThemeToPreview(theme); }}
              />
            </DeviceFrame>
            {!drawerOpen && (
              <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "rgba(13,13,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "6px 16px", fontSize: 11, color: "#8E8AA8", pointerEvents: "none", zIndex: 10 }}>
                Clique em qualquer bloco para editar
              </div>
            )}
          </div>

          {/* Divider arrastável */}
          {drawerOpen && selectedBlock && (
            <div onMouseDown={onDividerMouseDown} style={{ height: 10, flexShrink: 0, cursor: "ns-resize", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", userSelect: "none" }}>
              <div style={{ display: "flex", gap: 3 }}>
                {[0,1,2].map((i) => <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />)}
              </div>
            </div>
          )}

          {/* ── DRAWER ──────────────────────────────── */}
          {drawerOpen && selectedBlock && (
            <div style={{ height: drawerHeight, flexShrink: 0, position: "relative", overflow: "hidden", background: "#0D0D12" }}>

              {/* Drawer header */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 44, display: "flex", alignItems: "center", padding: "0 12px", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0D0D12", zIndex: 10 }}>
                <span style={{ fontSize: 15 }}>{BLOCK_ICON[selectedBlock.type] ?? "📦"}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F0EEF8" }}>{selectedBlock.type}</span>
                {BLOCK_SOURCE[selectedBlock.type] && (
                  <span style={{ fontSize: 10, color: "#55526A", fontFamily: "monospace", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4 }}>
                    {BLOCK_SOURCE[selectedBlock.type]}
                  </span>
                )}
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: 2 }}>
                  {(["visual","code"] as EditorTab[]).map((t) => (
                    <button key={t} onClick={() => setTab(t)} style={{
                      padding: "4px 12px", borderRadius: 4, border: "none",
                      background: tab === t ? "#1E1E2A" : "transparent",
                      color: tab === t ? "#A67CFF" : "#55526A", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}>{t === "visual" ? "✦ Visual" : "</> Código"}</button>
                  ))}
                </div>
                <button onClick={() => { setDrawerOpen(false); setSelectedIdx(null); }} style={{ background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 14, padding: "4px 6px" }}>✕</button>
              </div>

              {/* Visual tab */}
              {tab === "visual" && (
                <div style={{ position: "absolute", top: 44, left: 0, right: 0, bottom: 0, overflow: "auto", padding: 16 }}>
                  <PropForm
                    data={selectedBlock.props}
                    path={[]}
                    brandId={brandId}
                    onChange={(path, val) => updateBlockProp(path, val)}
                  />
                </div>
              )}

              {/* Code tab */}
              {tab === "code" && (
                <>
                  <style>{`.lhg-code section { padding-top: 0 !important; padding-bottom: 10px !important; }`}</style>
                  <div className="lhg-code" style={{ position: "absolute", left: 0, right: 0, top: 0, height: drawerHeight, overflow: "hidden" }}>
                    <MonacoEditor
                      height={drawerHeight}
                      width="100%"
                      defaultLanguage="json"
                      theme="vs-dark"
                      value={JSON.stringify(selectedBlock, null, 2)}
                      onChange={(v) => updateBlockJson(v ?? "")}
                      onMount={(editor) => { monacoRef.current = editor; requestAnimationFrame(() => editor.layout()); }}
                      options={{ automaticLayout: true, fontSize: 13, minimap: { enabled: false }, wordWrap: "on", tabSize: 2, scrollBeyondLastLine: false, padding: { top: 0, bottom: 10 } }}
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

/* ── PropForm ───────────────────────────────────────── */
function PropForm({
  data, path, brandId, onChange,
}: {
  data: Record<string, unknown>;
  path: string[];
  brandId: string;
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
              <textarea value={val} onChange={(e) => onChange(fullPath, e.target.value)} style={fieldStyle} rows={3} />
            ) : typeof val === "string" ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input type="text" value={val} onChange={(e) => onChange(fullPath, e.target.value)} style={{ ...fieldStyle, flex: 1 }} />
                {MEDIA_KEY.test(key) && (
                  <UploadBtn brandId={brandId} onUploaded={(p) => onChange(fullPath, p)} />
                )}
              </div>
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
                <PropForm data={val as Record<string, unknown>} path={fullPath} brandId={brandId} onChange={onChange} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ── UploadBtn ──────────────────────────────────────── */
function UploadBtn({ brandId, onUploaded }: { brandId: string; onUploaded: (path: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("brandId", brandId);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const { path } = await res.json() as { path: string };
      onUploaded(path);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <>
      <input ref={ref} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />
      <button
        onClick={() => ref.current?.click()}
        disabled={uploading}
        title="Fazer upload de arquivo"
        style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6, padding: "0 10px", fontSize: 13, cursor: uploading ? "wait" : "pointer",
          color: "#8E8AA8", flexShrink: 0, height: "100%",
        }}
      >
        {uploading ? "…" : "↑"}
      </button>
    </>
  );
}

/* ── utils ──────────────────────────────────────────── */
const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "7px 10px", color: "#F0EEF8", fontSize: 13, outline: "none",
  fontFamily: "inherit", resize: "vertical",
};

function undoRedoBtn(active: boolean): React.CSSProperties {
  return {
    background: "none", border: "none", cursor: active ? "pointer" : "default",
    color: active ? "#8E8AA8" : "#2A2838", fontSize: 14, padding: "4px 8px", borderRadius: 4,
  };
}

function deepSet(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  if (path.length === 0) return obj;
  const [key, ...rest] = path;
  if (!key) return obj;
  return { ...obj, [key]: rest.length === 0 ? value : deepSet((obj[key] as Record<string, unknown>) ?? {}, rest, value) };
}
