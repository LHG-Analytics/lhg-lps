"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  DndContext, closestCenter, DragOverlay, PointerSensor,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { DeviceFrame, type Device } from "./DeviceFrame";
import { SortableBlockItem, BLOCK_ICON } from "./SortableBlockItem";
import { ThemePanel, type Theme } from "./ThemePanel";
import { DeployPanel, type DeployConfig } from "./DeployPanel";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/* ── tipos ─────────────────────────────────────────── */
type EditorTab  = "visual" | "code" | "style";
type SidebarTab = "blocks" | "theme" | "seo";
type BlockStyle = { bg?: string; paddingTop?: number; paddingBottom?: number };
type Meta       = { title?: string; description?: string };
type Block      = { type: string; props: Record<string, unknown>; _id?: string; _style?: BlockStyle };
type Version    = { id: string; ts: number; label: string; blocks: Block[] };

const BLOCK_SOURCE: Record<string, string> = {
  nav: "components/blocks/Nav.tsx", hero: "components/blocks/Hero.tsx",
  benefits: "components/blocks/Benefits.tsx", unitPicker: "components/blocks/UnitPicker.tsx",
  offer: "components/blocks/Offer.tsx", faq: "components/blocks/FAQ.tsx",
  footer: "components/blocks/Footer.tsx", stickyCta: "components/blocks/StickyCta.tsx",
};

const MEDIA_KEY = /image|img|src|video|poster|photo|thumb|media|bg/i;

/* Props mínimas para cada tipo — evita crash quando props: {} é enviado ao preview */
const BLOCK_DEFAULTS: Record<string, Record<string, unknown>> = {
  nav: { tag: "Nova campanha" },
  hero: {
    video: "", eyebrow: "Edição limitada", headlineFull: "Seu título aqui",
    headlineEmphasis: "título", typewriter: false, subtitle: "Subtítulo da campanha.",
    primaryCta: { label: "Saiba mais", href: "#" }, meta: [],
  },
  benefits: {
    eyebrow: "Benefícios", headlineFull: "Por que escolher", headlineEmphasis: "escolher", items: [],
  },
  unitPicker: {
    id: "unit-picker", eyebrow: "Escolha sua unidade", headline: "Reserve agora", subtitle: "",
    units: [],
    wizardSteps: [{ n: 1, label: "Período" }, { n: 2, label: "Data" }, { n: 3, label: "Suíte" }, { n: 4, label: "Resumo" }],
    stepCopy: {
      period: { title: "Escolha o período", hint: "" },
      date: { title: "Escolha a data", hint: "", smallHint: "", couponHint: "" },
      category: { title: "Escolha a suíte", hint: "", hint3hIpiranga: "", hint3hLapa: "", hintAllPernoite: "" },
      summary: { title: "Resumo", hint: "", labels: { unit: "Unidade", period: "Período", date: "Data", category: "Suíte", inclusos: "Inclusos", lot: "Lote", price: "Valor" }, couponLine: "", lotLineNoCoupon: "" },
    },
    openCtaLabel: "Reservar", confirmCtaLabel: "Confirmar",
  },
  offer: {
    eyebrow: "Oferta especial", headlineFull: "Título da oferta", headlineHtml: "Título da <em>oferta</em>",
    subtitle: "Subtítulo", countdownTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ctas: [{ label: "Reservar agora", href: "#", variant: "gold" }], note: "",
  },
  faq: {
    eyebrow: "FAQ", headlineFull: "Perguntas frequentes", headlineEmphasis: "frequentes",
    intro: "", items: [{ q: "Pergunta?", a: "Resposta." }],
  },
  footer: {
    tagline: "Tagline da marca.", columns: [],
    copyright: `© ${new Date().getFullYear()} Lush Hotel Group. Todos os direitos reservados.`,
    ageNotice: "Proibido para menores de 18 anos.",
  },
  stickyCta: { ctas: [{ label: "Reservar", href: "#", variant: "gold" }] },
};

/* ── props ─────────────────────────────────────────── */
interface Props {
  campaignId: string;
  brandId: string;
  slug: string;
  initialBlocks: Block[];
  initialTheme: Record<string, string>;
  initialMeta?: Meta;
  initialDeploy?: DeployConfig;
  status: string;
}

/* ═══════════════════════════════════════════════════ */
export function CampaignEditor({ campaignId, brandId, slug, initialBlocks, initialTheme, initialMeta, initialDeploy, status }: Props) {
  const [blocks, setBlocks]                   = useState<Block[]>(() =>
    initialBlocks.map((b, i) => b._id ? b : { ...b, _id: `blk-${b.type}-${i}` })
  );
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
  const [meta, setMeta]                       = useState<Meta>(initialMeta ?? {});
  const [metaSaving, setMetaSaving]           = useState(false);
  const [canUndo, setCanUndo]                 = useState(false);
  const [canRedo, setCanRedo]                 = useState(false);
  const [activeId, setActiveId]               = useState<string | null>(null);
  const [fieldFilter, setFieldFilter]         = useState("");
  const [versionsOpen, setVersionsOpen]       = useState(false);
  const [versions, setVersions]               = useState<Version[]>([]);
  const [dupModal, setDupModal]               = useState({ open: false, slug: `${slug}-copia`, saving: false, error: "" });
  const [deployOpen, setDeployOpen]           = useState(false);
  const [deploy, setDeploy]                   = useState<DeployConfig>(initialDeploy ?? { mode: null, domain: "", basePath: "" });

  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const divDragRef  = useRef<{ startY: number; startH: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoRef   = useRef<any>(null);

  // ── história de undo/redo via refs (sem stale closure)
  const histRef     = useRef({ stack: [initialBlocks] as Block[][], idx: 0 });
  const versionsRef = useRef<Version[]>([]);

  const pushVersion = useCallback((b: Block[]) => {
    const v: Version = { id: crypto.randomUUID(), ts: Date.now(), label: new Date().toLocaleString("pt-BR"), blocks: b };
    const next = [v, ...versionsRef.current].slice(0, 20);
    versionsRef.current = next;
    setVersions(next);
    try { localStorage.setItem(`lhg-versions-${campaignId}`, JSON.stringify(next)); } catch { /* storage indisponível */ }
  }, [campaignId]);

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`lhg-versions-${campaignId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as Version[];
        versionsRef.current = parsed;
        setVersions(parsed);
      }
    } catch { /* storage indisponível */ }
  }, [campaignId]);

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
      if (publish) { setPublishedBlocks(b); pushVersion(b); }
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  }, [campaignId, pushVersion]);

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

  function updateBlockStyle(patch: Partial<BlockStyle>) {
    if (selectedIdx === null) return;
    const next = blocks.map((b, i) => {
      if (i !== selectedIdx) return b;
      const merged = { ...b._style, ...patch } as Record<string, unknown>;
      Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);
      return { ...b, _style: Object.keys(merged).length > 0 ? merged as BlockStyle : undefined };
    });
    updateBlocks(next);
  }

  async function saveMeta(m: Meta) {
    setMetaSaving(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta: m }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar SEO.");
    } finally { setMetaSaving(false); }
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
    const clone = { ...JSON.parse(JSON.stringify(blocks[idx])) as Block, _id: crypto.randomUUID() };
    const next = [...blocks.slice(0, idx + 1), clone, ...blocks.slice(idx + 1)];
    setSelectedIdx(idx + 1);
    setDrawerOpen(true);
    updateBlocks(next);
  }

  function addBlock(type: string) {
    const next = [...blocks, { type, props: BLOCK_DEFAULTS[type] ?? {}, _id: crypto.randomUUID() }];
    setSelectedIdx(next.length - 1);
    setDrawerOpen(true);
    updateBlocks(next);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
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

  function restoreVersion(v: Version) {
    setBlocks(v.blocks);
    pushHistory(v.blocks);
    sendToPreview(v.blocks);
    setVersionsOpen(false);
    scheduleAutoSave(v.blocks);
  }

  async function duplicateCampaign() {
    setDupModal((m) => ({ ...m, saving: true, error: "" }));
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: campaignId, slug: dupModal.slug }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json() as { id: string };
      window.location.href = `/admin/campaigns/${id}`;
    } catch (err) {
      setDupModal((m) => ({ ...m, saving: false, error: err instanceof Error ? err.message : "Erro ao duplicar." }));
    }
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

        {/* Versões + Duplicar */}
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={() => setVersionsOpen((v) => !v)}
            title="Histórico de versões"
            style={{ ...undoRedoBtn(true), background: versionsOpen ? "rgba(166,124,255,0.18)" : "none", color: versionsOpen ? "#A67CFF" : "#55526A", fontSize: 13 }}
          >🕐</button>
          <button
            onClick={() => setDupModal((m) => ({ ...m, open: true, slug: `${slug}-copia` }))}
            title="Duplicar campanha"
            style={{ ...undoRedoBtn(true), color: "#55526A", fontSize: 13 }}
          >⎘</button>
          <button
            onClick={() => setDeployOpen(true)}
            title="Configurar deploy (subdomínio / subdiretório)"
            style={{ ...undoRedoBtn(true), color: deploy.mode ? "#A67CFF" : "#55526A", fontSize: 13 }}
          >🌐</button>
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
          <div style={{ display: "flex", padding: "8px 8px 0", gap: 3 }}>
            {(["blocks","theme","seo"] as SidebarTab[]).map((t) => (
              <button key={t} onClick={() => setSidebarTab(t)} style={{
                flex: 1, padding: "5px 0", border: "none", borderRadius: 6,
                background: sidebarTab === t ? "rgba(166,124,255,0.18)" : "transparent",
                color: sidebarTab === t ? "#A67CFF" : "#55526A",
                fontSize: 10, fontWeight: 700, cursor: "pointer",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {t === "blocks" ? `Blocos` : t === "theme" ? "🎨 Tema" : "📋 SEO"}
              </button>
            ))}
          </div>

          {sidebarTab === "blocks" ? (
            <>
              {/* Block list with DnD */}
              <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={() => setActiveId(null)}
                >
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

                  <DragOverlay dropAnimation={{ duration: 120, easing: "cubic-bezier(0.2,0,0,1)" }}>
                    {activeId !== null && (() => {
                      const b = blocks[Number(activeId)];
                      if (!b) return null;
                      return (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "7px 6px",
                          borderRadius: 7, cursor: "grabbing",
                          background: "rgba(166,124,255,0.22)",
                          border: "1px solid rgba(166,124,255,0.55)",
                          boxShadow: "0 10px 28px rgba(0,0,0,0.55), 0 2px 8px rgba(166,124,255,0.25)",
                          transform: "scale(1.03)",
                        }}>
                          <span style={{ color: "#8878CC", fontSize: 12, padding: "0 2px", lineHeight: 1 }}>⠿</span>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{BLOCK_ICON[b.type] ?? "📦"}</span>
                          <span style={{ fontSize: 12, color: "#C4AEFF", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {b.type}
                          </span>
                        </div>
                      );
                    })()}
                  </DragOverlay>
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
          ) : sidebarTab === "theme" ? (
            <ThemePanel theme={theme} onChange={updateTheme} saving={themeSaving} onSave={saveTheme} />
          ) : (
            /* ── SEO panel ─────────────────────────── */
            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Título da página</label>
                  <input
                    type="text"
                    value={meta.title ?? ""}
                    onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                    style={fieldStyle}
                    placeholder="Título SEO"
                  />
                  <div style={{ fontSize: 10, color: (meta.title?.length ?? 0) > 60 ? "#E05260" : "#3A3850", marginTop: 3, textAlign: "right" }}>
                    {meta.title?.length ?? 0}/60
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Descrição</label>
                  <textarea
                    value={meta.description ?? ""}
                    onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                    style={{ ...fieldStyle, resize: "vertical" }}
                    rows={4}
                    placeholder="Descrição para mecanismos de busca"
                  />
                  <div style={{ fontSize: 10, color: (meta.description?.length ?? 0) > 160 ? "#E05260" : "#3A3850", marginTop: 3, textAlign: "right" }}>
                    {meta.description?.length ?? 0}/160
                  </div>
                </div>
                <button
                  onClick={() => saveMeta(meta)}
                  disabled={metaSaving}
                  style={{
                    background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6,
                    padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: metaSaving ? "wait" : "pointer",
                    opacity: metaSaving ? 0.6 : 1,
                  }}
                >
                  {metaSaving ? "Salvando…" : "Salvar SEO"}
                </button>
              </div>
            </div>
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
            {versionsOpen && (
              <VersionsPanel
                versions={versions}
                onRestore={restoreVersion}
                onClose={() => setVersionsOpen(false)}
              />
            )}
            <DeviceFrame device={device} zoom={zoom}>
              <iframe
                ref={iframeRef}
                src={`/admin/preview/${brandId}/${slug}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Preview ao vivo"
                allow="autoplay"
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
                  {(["visual","style","code"] as EditorTab[]).map((t) => (
                    <button key={t} onClick={() => setTab(t)} style={{
                      padding: "4px 10px", borderRadius: 4, border: "none",
                      background: tab === t ? "#1E1E2A" : "transparent",
                      color: tab === t ? "#A67CFF" : "#55526A", fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}>{t === "visual" ? "✦ Visual" : t === "style" ? "🎨 Estilo" : "</> Código"}</button>
                  ))}
                </div>
                <button onClick={() => { setDrawerOpen(false); setSelectedIdx(null); }} style={{ background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 14, padding: "4px 6px" }}>✕</button>
              </div>

              {/* Visual tab */}
              {tab === "visual" && (
                <div style={{ position: "absolute", top: 44, left: 0, right: 0, bottom: 0, overflow: "auto", padding: 16 }}>
                  <input
                    type="text"
                    placeholder="Buscar campo…"
                    value={fieldFilter}
                    onChange={(e) => setFieldFilter(e.target.value)}
                    style={{ ...fieldStyle, fontSize: 11, marginBottom: 12, padding: "6px 10px" }}
                  />
                  <PropForm
                    data={selectedBlock.props}
                    path={[]}
                    brandId={brandId}
                    onChange={(path, val) => updateBlockProp(path, val)}
                    filter={fieldFilter || undefined}
                  />
                </div>
              )}

              {/* Style tab */}
              {tab === "style" && (
                <div style={{ position: "absolute", top: 44, left: 0, right: 0, bottom: 0, overflow: "auto", padding: 16 }}>
                  <BlockStylePanel
                    style={selectedBlock._style}
                    onChange={(patch) => updateBlockStyle(patch)}
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

      <DuplicateModal
        state={dupModal}
        onChange={(s) => setDupModal((m) => ({ ...m, slug: s }))}
        onConfirm={duplicateCampaign}
        onClose={() => setDupModal((m) => ({ ...m, open: false, error: "" }))}
      />

      <DeployPanel
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        campaignId={campaignId}
        initial={deploy}
        onSaved={(cfg) => setDeploy(cfg)}
      />
    </div>
  );
}

/* ── PropForm ───────────────────────────────────────── */
const ENUM_OPTIONS: Record<string, string[]> = {
  variant:  ["gold", "emerald", "red", "ghost"],
  icon:     ["heart", "calendar", "champagne", "clock"],
  tier:     ["regular", "premium"],
  scopeKey: ["3h", "all"],
};

function labelify(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function deepKeyMatch(val: unknown, f: string): boolean {
  if (typeof val === "object" && val !== null && !Array.isArray(val)) {
    return Object.entries(val as Record<string, unknown>).some(([k, v]) => k.toLowerCase().includes(f) || deepKeyMatch(v, f));
  }
  if (Array.isArray(val)) return val.some((item) => deepKeyMatch(item, f));
  return false;
}

function PropForm({
  data, path, brandId, onChange, filter,
}: {
  data: Record<string, unknown>;
  path: string[];
  brandId: string;
  onChange: (path: string[], val: unknown) => void;
  filter?: string;
}) {
  const f = filter?.toLowerCase() ?? "";
  const entries = Object.entries(data).filter(([key, val]) => {
    if (!f) return true;
    return key.toLowerCase().includes(f) || labelify(key).toLowerCase().includes(f) || deepKeyMatch(val, f);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.length === 0 && f && (
        <div style={{ fontSize: 11, color: "#3A3850", textAlign: "center", padding: "12px 0" }}>
          Nenhum campo encontrado para &quot;{filter}&quot;
        </div>
      )}
      {entries.map(([key, val]) => {
        const fullPath = [...path, key];
        return (
          <div key={key}>
            <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {labelify(key)}
            </label>

            {ENUM_OPTIONS[key] ? (
              <select value={String(val ?? "")} onChange={(e) => onChange(fullPath, e.target.value)} style={fieldStyle}>
                {ENUM_OPTIONS[key].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>

            ) : typeof val === "string" && key.endsWith("Html") ? (
              <RichTextField value={val} onChange={(v) => onChange(fullPath, v)} />

            ) : typeof val === "string" && val.length > 80 ? (
              <textarea value={val} onChange={(e) => onChange(fullPath, e.target.value)} style={fieldStyle} rows={3} />

            ) : typeof val === "string" ? (
              <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                {/^#[0-9a-fA-F]{3,8}$/.test(val) && (
                  <input type="color" value={val} onChange={(e) => onChange(fullPath, e.target.value)}
                    style={{ width: 34, padding: 2, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, cursor: "pointer", background: "none", flexShrink: 0 }} />
                )}
                <input type="text" value={val} onChange={(e) => onChange(fullPath, e.target.value)} style={{ ...fieldStyle, flex: 1 }} />
                {MEDIA_KEY.test(key) && (
                  <UploadBtn brandId={brandId} onUploaded={(p) => onChange(fullPath, p)} />
                )}
              </div>

            ) : typeof val === "number" ? (
              <input type="number" value={val} onChange={(e) => onChange(fullPath, Number(e.target.value))} style={fieldStyle} />

            ) : typeof val === "boolean" ? (
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={val} onChange={(e) => onChange(fullPath, e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: "#A67CFF", cursor: "pointer" }} />
                <span style={{ fontSize: 12, color: val ? "#A67CFF" : "#55526A" }}>{val ? "Ativado" : "Desativado"}</span>
              </label>

            ) : Array.isArray(val) ? (
              <ArrayField value={val} path={fullPath} brandId={brandId} onChange={onChange} />

            ) : typeof val === "object" && val !== null ? (
              <div style={{ paddingLeft: 10, borderLeft: "2px solid rgba(255,255,255,0.07)", marginTop: 2 }}>
                <PropForm data={val as Record<string, unknown>} path={fullPath} brandId={brandId} onChange={onChange} filter={filter} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ── ArrayField ─────────────────────────────────────── */
function ArrayField({ value, path, brandId, onChange }: {
  value: unknown[];
  path: string[];
  brandId: string;
  onChange: (path: string[], val: unknown) => void;
}) {
  function updateItem(i: number, updated: unknown) {
    const next = [...value];
    next[i] = updated;
    onChange(path, next);
  }
  function removeItem(i: number) {
    onChange(path, value.filter((_, j) => j !== i));
  }
  function addItem() {
    const first = value[0];
    const blank: unknown =
      typeof first === "object" && first !== null
        ? Object.fromEntries(
            Object.entries(first as Record<string, unknown>).map(([k, v]) => [
              k, typeof v === "boolean" ? false : typeof v === "number" ? 0 : "",
            ])
          )
        : typeof first === "string" ? "" : {};
    onChange(path, [...value, blank]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {value.map((item, i) => (
        <div key={i} style={{ position: "relative", padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: typeof item === "object" ? 6 : 0 }}>
            <span style={{ fontSize: 9, color: "#3A3850", fontWeight: 700, letterSpacing: "0.1em" }}>#{i + 1}</span>
            <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#E05260", cursor: "pointer", fontSize: 10, padding: "1px 3px", lineHeight: 1 }}>✕</button>
          </div>
          {typeof item === "string" ? (
            <input type="text" value={item} onChange={(e) => updateItem(i, e.target.value)}
              style={{ ...fieldStyle, width: "100%", marginTop: typeof item === "object" ? 0 : -2 }} />
          ) : typeof item === "object" && item !== null ? (
            <PropForm data={item as Record<string, unknown>} path={[...path, String(i)]} brandId={brandId} onChange={onChange} />
          ) : null}
        </div>
      ))}
      <button onClick={addItem}
        style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 0", color: "#55526A", cursor: "pointer", fontSize: 11, textAlign: "center" }}>
        + Adicionar
      </button>
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

/* ── BlockStylePanel ────────────────────────────────── */
function BlockStylePanel({ style, onChange }: {
  style?: BlockStyle;
  onChange: (patch: Partial<BlockStyle>) => void;
}) {
  const s = style ?? {};
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Background */}
      <div>
        <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Cor de fundo do bloco</label>
        <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
          {/^#[0-9a-fA-F]{3,8}$/.test(s.bg ?? "") && (
            <input type="color" value={s.bg} onChange={(e) => onChange({ ...s, bg: e.target.value })}
              style={{ width: 34, padding: 2, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, cursor: "pointer", background: "none", flexShrink: 0 }} />
          )}
          <input
            type="text"
            value={s.bg ?? ""}
            placeholder="ex: #1A1A2E ou transparent"
            onChange={(e) => onChange({ ...s, bg: e.target.value || undefined })}
            style={{ ...fieldStyle, flex: 1 }}
          />
          {s.bg && (
            <button onClick={() => onChange({ ...s, bg: undefined })}
              style={{ background: "none", border: "1px solid rgba(224,82,96,0.3)", borderRadius: 6, color: "#E05260", cursor: "pointer", fontSize: 11, padding: "0 10px" }}>✕</button>
          )}
        </div>
        <div style={{ fontSize: 10, color: "#3A3850", marginTop: 4 }}>Aplica-se como background do wrapper. Útil com espaçamento.</div>
      </div>

      {/* Spacing top */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ fontSize: 10, color: "#8E8AA8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Espaço acima</label>
          <span style={{ fontSize: 12, color: "#A67CFF", fontWeight: 700, minWidth: 36, textAlign: "right" }}>{s.paddingTop ?? 0}px</span>
        </div>
        <input
          type="range" min={0} max={200} step={4}
          value={s.paddingTop ?? 0}
          onChange={(e) => { const v = Number(e.target.value); onChange({ ...s, paddingTop: v || undefined }); }}
          style={{ width: "100%", accentColor: "#A67CFF" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#3A3850", marginTop: 2 }}>
          <span>0</span><span>200</span>
        </div>
      </div>

      {/* Spacing bottom */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ fontSize: 10, color: "#8E8AA8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Espaço abaixo</label>
          <span style={{ fontSize: 12, color: "#A67CFF", fontWeight: 700, minWidth: 36, textAlign: "right" }}>{s.paddingBottom ?? 0}px</span>
        </div>
        <input
          type="range" min={0} max={200} step={4}
          value={s.paddingBottom ?? 0}
          onChange={(e) => { const v = Number(e.target.value); onChange({ ...s, paddingBottom: v || undefined }); }}
          style={{ width: "100%", accentColor: "#A67CFF" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#3A3850", marginTop: 2 }}>
          <span>0</span><span>200</span>
        </div>
      </div>

      {(s.bg || s.paddingTop || s.paddingBottom) && (
        <button
          onClick={() => onChange({ bg: undefined, paddingTop: undefined, paddingBottom: undefined })}
          style={{ background: "rgba(224,82,96,0.08)", border: "1px solid rgba(224,82,96,0.2)", borderRadius: 6, padding: "7px 0", color: "#E05260", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
        >
          Resetar estilos deste bloco
        </button>
      )}
    </div>
  );
}

/* ── RichTextField ──────────────────────────────────── */
function RichTextField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  function cmd(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 1, padding: "3px 5px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0A0A10" }}>
        <RtBtn onClick={() => cmd("bold")} title="Negrito"><strong style={{ fontSize: 11 }}>B</strong></RtBtn>
        <RtBtn onClick={() => cmd("italic")} title="Itálico"><em style={{ fontSize: 11 }}>I</em></RtBtn>
        <RtBtn onClick={() => cmd("insertHTML", "<em></em>")} title="Inserir &lt;em&gt;">em</RtBtn>
        <RtBtn onClick={() => cmd("insertHTML", "<strong></strong>")} title="Inserir &lt;strong&gt;">str</RtBtn>
        <div style={{ width: 1, background: "rgba(255,255,255,0.08)", margin: "2px 2px" }} />
        <RtBtn onClick={() => cmd("removeFormat")} title="Remover formatação" style={{ color: "#E05260" }}>✕ fmt</RtBtn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        style={{ ...fieldStyle, borderRadius: 0, border: "none", minHeight: 38, outline: "none" }}
      />
    </div>
  );
}

function RtBtn({ children, onClick, title, style }: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8AA8", fontSize: 11, padding: "2px 5px", borderRadius: 3, ...style }}
    >
      {children}
    </button>
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
  if (rest.length === 0) return { ...obj, [key]: value };
  const current = obj[key];
  // Quando o próximo segmento é um índice numérico e o valor atual é array, preserva como array
  if (Array.isArray(current) && /^\d+$/.test(rest[0]!)) {
    const idx = Number(rest[0]);
    const tail = rest.slice(1);
    const newArr = [...current];
    newArr[idx] = tail.length === 0 ? value : deepSet((newArr[idx] as Record<string, unknown>) ?? {}, tail, value);
    return { ...obj, [key]: newArr };
  }
  return { ...obj, [key]: deepSet((current as Record<string, unknown>) ?? {}, rest, value) };
}

/* ── VersionsPanel ──────────────────────────────────── */
function VersionsPanel({ versions, onRestore, onClose }: {
  versions: Version[];
  onRestore: (v: Version) => void;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: "absolute", top: 0, right: 0, bottom: 0, width: 232, zIndex: 20,
      background: "#0D0D12", borderLeft: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#F0EEF8" }}>Histórico de versões</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 13, padding: "2px 4px" }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {versions.length === 0 ? (
          <div style={{ fontSize: 11, color: "#3A3850", textAlign: "center", padding: "24px 12px", lineHeight: 1.5 }}>
            Nenhuma versão salva.<br />Publique a campanha para criar um snapshot.
          </div>
        ) : versions.map((v) => (
          <div
            key={v.id}
            onClick={() => onRestore(v)}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", marginBottom: 5, cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(166,124,255,0.35)"; e.currentTarget.style.background = "rgba(166,124,255,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
          >
            <div style={{ fontSize: 11, color: "#C4AEFF", fontWeight: 600 }}>{v.label}</div>
            <div style={{ fontSize: 10, color: "#55526A", marginTop: 2 }}>{v.blocks.length} bloco{v.blocks.length !== 1 ? "s" : ""} · clique para restaurar</div>
          </div>
        ))}
      </div>
      {versions.length > 0 && (
        <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: "#3A3850" }}>Máx. 20 versões armazenadas localmente.</div>
        </div>
      )}
    </div>
  );
}

/* ── DuplicateModal ─────────────────────────────────── */
function DuplicateModal({ state, onChange, onConfirm, onClose }: {
  state: { open: boolean; slug: string; saving: boolean; error: string };
  onChange: (slug: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!state.open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#13121A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 24, width: 340, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#F0EEF8" }}>Duplicar campanha</div>
        <div style={{ fontSize: 12, color: "#8E8AA8" }}>Cria uma cópia em rascunho com os mesmos blocos e configurações.</div>
        <div>
          <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Slug da cópia</label>
          <input
            type="text"
            value={state.slug}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...fieldStyle, width: "100%" }}
            placeholder="ex: namorados-copia"
            onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); if (e.key === "Escape") onClose(); }}
            autoFocus
          />
        </div>
        {state.error && <div style={{ fontSize: 11, color: "#E05260" }}>{state.error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 0", color: "#8E8AA8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={state.saving || !state.slug.trim()}
            style={{ flex: 1, background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: state.saving || !state.slug.trim() ? "default" : "pointer", opacity: state.saving || !state.slug.trim() ? 0.6 : 1 }}
          >
            {state.saving ? "Duplicando…" : "Duplicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
