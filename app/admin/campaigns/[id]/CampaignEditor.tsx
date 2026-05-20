"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { BENEFIT_ICON_KEYS, BENEFIT_ICON_LABELS, BENEFIT_ICON_PATHS, type BenefitIconKey } from "@/lib/benefit-icons";
import { z } from "zod";

const BlockShapeSchema = z.array(
  z.object({ type: z.string().min(1), props: z.record(z.string(), z.unknown()) }).passthrough()
);
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
import { LotsPanel, type Lot } from "./LotsPanel";
import { PricingPanel } from "./PricingPanel";
import { MediaLibrary } from "./MediaLibrary";
import { PeriodsPanel } from "./PeriodsPanel";
import { ImageUploadField } from "@/app/admin/_components/ImageUploadField";
import { SeoPanel, type SeoMeta } from "./SeoPanel";
import { FloatingInspector } from "./FloatingInspector";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

/* ── tipos ─────────────────────────────────────────── */
type EditorTab  = "visual" | "code" | "style";
type SidebarTab = "blocks" | "theme" | "seo";
type BlockStyle = {
  cssVars?: Record<string, string>;
  elementOverrides?: Record<string, Record<string, string>>;
  bg?: string;
  color?: string;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  borderRadius?: number;
  opacity?: number;
};
type Meta = SeoMeta;
type Block        = { type: string; props: Record<string, unknown>; _id?: string; _style?: BlockStyle };
type Version      = { id: string; ts: number; label: string; blocks: Block[] };
type BlockElement = { selector: string; tagName: string; computedStyles: Record<string, string> };

const BLOCK_SOURCE: Record<string, string> = {
  nav: "components/blocks/Nav.tsx", hero: "components/blocks/Hero.tsx",
  benefits: "components/blocks/Benefits.tsx", unitPicker: "components/blocks/UnitPicker.tsx",
  offer: "components/blocks/Offer.tsx", faq: "components/blocks/FAQ.tsx",
  footer: "components/blocks/Footer.tsx", stickyCta: "components/blocks/StickyCta.tsx",
};

const MEDIA_KEY = /image|img|src|video|poster|photo|thumb|media|bg/i;

const BLOCK_CSS_VARS: Record<string, Array<{ key: string; label: string }>> = {
  nav: [
    { key: "lav",      label: "Cor de destaque" },
    { key: "bg",       label: "Fundo" },
    { key: "ink-mut",  label: "Texto da tag" },
    { key: "gold",     label: "Destaque na tag" },
    { key: "line",     label: "Borda ao rolar a página" },
  ],
  hero: [
    { key: "lav",  label: "Destaque (título em gradiente, cursor, botão)" },
    { key: "bg",   label: "Fundo" },
    { key: "ink",  label: "Cor do texto" },
  ],
  benefits: [
    { key: "lav",       label: "Ícones e destaques" },
    { key: "bg",        label: "Fundo dos cards" },
    { key: "bg-elev",   label: "Fundo hover dos cards" },
    { key: "ink-mut",   label: "Texto dos cards" },
    { key: "line",      label: "Grade entre cards" },
    { key: "line-soft", label: "Linhas suaves" },
  ],
  unitPicker: [
    { key: "lav",     label: "Destaque (foco, hover, botão de seleção)" },
    { key: "bg",      label: "Fundo da seção" },
    { key: "bg-card", label: "Fundo dos cards de unidade" },
    { key: "bg-elev", label: "Fundo hover/foco" },
    { key: "ink-mut", label: "Texto secundário" },
    { key: "line",    label: "Bordas dos cards" },
    { key: "emerald", label: "Cor de confirmação / selecionado" },
  ],
  offer: [
    { key: "lav",     label: "Destaque (contador, borda neon)" },
    { key: "bg",      label: "Fundo" },
    { key: "bg-elev", label: "Fundo do card da oferta" },
    { key: "emerald", label: "Segunda cor do neon" },
    { key: "ink-mut", label: "Texto secundário" },
    { key: "line",    label: "Bordas" },
  ],
  faq: [
    { key: "lav",       label: "Destaque (hover da pergunta, ícone aberto)" },
    { key: "bg",        label: "Fundo da seção" },
    { key: "ink",       label: "Cor das perguntas" },
    { key: "ink-mut",   label: "Cor das respostas" },
    { key: "line",      label: "Bordas dos itens" },
    { key: "line-soft", label: "Separadores suaves" },
  ],
  footer: [
    { key: "lav",       label: "Títulos das colunas e hover dos links" },
    { key: "ink-mut",   label: "Cor dos links" },
    { key: "ink-dim",   label: "Texto fraco (copyright, aviso)" },
    { key: "line-soft", label: "Borda superior" },
  ],
  stickyCta: [
    { key: "lav",  label: "Cor do botão principal" },
    { key: "line", label: "Borda da barra" },
  ],
};

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
  initialLots?: Lot[];
  status: string;
}

/* ═══════════════════════════════════════════════════ */
export function CampaignEditor({ campaignId, brandId, slug, initialBlocks, initialTheme, initialMeta, initialDeploy, initialLots, status }: Props) {
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
  const [lotsOpen, setLotsOpen]               = useState(false);
  const [lots, setLots]                       = useState<Lot[]>(initialLots ?? []);
  const [pricingOpen, setPricingOpen]         = useState(false);
  const [mediaOpen, setMediaOpen]             = useState(false);
  const [periodsOpen, setPeriodsOpen]         = useState(false);
  const [blockElements, setBlockElements]     = useState<BlockElement[]>([]);
  const [pickerActive, setPickerActive]       = useState(false);
  const [inspectorMode, setInspectorMode]     = useState(false);
  const [pickedElement, setPickedElement]     = useState<{
    blockIndex: number; blockId: string; selector: string;
    computedStyles: Record<string, string>; tagName: string;
  } | null>(null);
  const [pickedRect, setPickedRect]           = useState<{
    top: number; left: number; right: number; bottom: number; width: number; height: number;
  } | null>(null);

  const [blankInput, setBlankInput]            = useState<string | null>(null);

  const iframeRef          = useRef<HTMLIFrameElement>(null);
  const saveTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const divDragRef         = useRef<{ startY: number; startH: number } | null>(null);
  const monacoRef          = useRef<any>(null);
  const skipPickResetRef   = useRef(false);
  const selectedIdxRef     = useRef<number | null>(null);
  const deleteBlockRef     = useRef<(idx: number) => void>(() => {});
  const pickedElementRef   = useRef<typeof pickedElement>(null);
  const copiedBlockRef     = useRef<Block | null>(null);
  const blocksRef          = useRef<Block[]>(blocks);
  const pasteBlockRef      = useRef<() => void>(() => {});

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

  // Manter refs em sync — não disparam re-render
  selectedIdxRef.current   = selectedIdx;
  deleteBlockRef.current   = deleteBlock;
  pickedElementRef.current = pickedElement;
  blocksRef.current        = blocks;
  pasteBlockRef.current    = pasteBlock;

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
      if (e.data?.type === "block-click") {
        setSelectedIdx(e.data.blockIndex ?? null);
        setDrawerOpen(true);
        setBlockElements(e.data.elements ?? []);
        window.focus();
      }
      if (e.data?.type === "block-computed-styles") setBlockElements(e.data.elements ?? []);
      if (e.data?.type === "preview-ready") { sendToPreview(blocks); sendThemeToPreview(theme); }
      if (e.data?.type === "element-selected") {
        setPickerActive(false);
        setInspectorMode(false);
        skipPickResetRef.current = true;
        setSelectedIdx(e.data.blockIndex);
        setDrawerOpen(true);
        setPickedElement({
          blockIndex: e.data.blockIndex,
          blockId: e.data.blockId,
          selector: e.data.selector,
          computedStyles: e.data.computedStyles,
          tagName: e.data.tagName,
        });
        setPickedRect(e.data.rect ?? null);
        window.focus();
      }
      if (e.data?.type === "block-and-element-click") {
        skipPickResetRef.current = true;
        setSelectedIdx(e.data.blockIndex);
        setDrawerOpen(true);
        setBlockElements(e.data.elements ?? []);
        setPickedElement({
          blockIndex: e.data.blockIndex,
          blockId: e.data.blockId,
          selector: e.data.selector,
          computedStyles: e.data.computedStyles,
          tagName: e.data.tagName,
        });
        setPickedRect(e.data.rect ?? null);
        window.focus();
      }
      if (e.data?.type === "picker-cancelled") { setPickerActive(false); setInspectorMode(false); }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [blocks, theme]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "select-block", blockIndex: selectedIdx }, "*");
    if (skipPickResetRef.current) {
      skipPickResetRef.current = false;
    } else {
      setPickedElement(null);
      setPickedRect(null);
      setPickerActive(false);
      setInspectorMode(false);
      setBlockElements([]);
      iframeRef.current?.contentWindow?.postMessage({ type: "disable-element-picker" }, "*");
    }
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
      if (mod) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undoFn(); }
        if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redoFn(); }
        const tgt = e.target as HTMLElement;
        const inInput = tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable;
        if (!inInput && !pickedElementRef.current) {
          if (e.key === "c") {
            const idx = selectedIdxRef.current;
            const b = idx !== null ? blocksRef.current[idx] : null;
            if (b) { copiedBlockRef.current = JSON.parse(JSON.stringify(b)); }
          }
          if (e.key === "v" && copiedBlockRef.current) {
            e.preventDefault();
            pasteBlockRef.current();
          }
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const tgt = e.target as HTMLElement;
        // Não interfere com inputs, textareas ou o Monaco (contenteditable)
        if (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable) return;
        // Elemento inspecionado selecionado — não apaga o bloco inteiro
        if (pickedElementRef.current) return;
        const idx = selectedIdxRef.current;
        if (idx === null) return;
        e.preventDefault();
        deleteBlockRef.current(idx);
      }
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

    // Validação client-side antes de enviar ao servidor
    const validation = BlockShapeSchema.safeParse(b);
    if (!validation.success) {
      const msg = validation.error.issues
        .map((e) => `[bloco ${String(e.path[0] ?? "?")}] ${e.message}`)
        .join("; ");
      setError(`Blocos inválidos — corrija antes de salvar: ${msg}`);
      return;
    }

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

  function updateElementOverride(selector: string, property: string, value: string) {
    if (selectedIdx === null) return;
    const next = blocks.map((b, i) => {
      if (i !== selectedIdx) return b;
      const current = b._style?.elementOverrides ?? {};
      const props = { ...(current[selector] ?? {}), [property]: value };
      if (!value) delete props[property];
      const newOverrides = { ...current };
      if (Object.keys(props).length > 0) { newOverrides[selector] = props; } else { delete newOverrides[selector]; }
      const newStyle: BlockStyle = {
        ...b._style,
        elementOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
      };
      return { ...b, _style: newStyle };
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

  function pasteBlock() {
    const copied = copiedBlockRef.current;
    if (!copied) return;
    const idx = selectedIdxRef.current;
    const insertAt = idx !== null ? idx + 1 : blocksRef.current.length;
    const clone = { ...JSON.parse(JSON.stringify(copied)) as Block, _id: crypto.randomUUID() };
    const next = [...blocksRef.current.slice(0, insertAt), clone, ...blocksRef.current.slice(insertAt)];
    updateBlocks(next);
    setSelectedIdx(insertAt);
    setDrawerOpen(true);
    iframeRef.current?.contentWindow?.postMessage({ type: "select-block", blockIndex: insertAt }, "*");
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
        <div style={{ display: "flex", gap: 1 }}>
          <TBtn onClick={undoFn} disabled={!canUndo} title="Desfazer (Ctrl+Z)"><Ico name="undo" /></TBtn>
          <TBtn onClick={redoFn} disabled={!canRedo} title="Refazer (Ctrl+Y)"><Ico name="redo" /></TBtn>
        </div>

        <Divider />

        {/* Ferramentas */}

        <div style={{ display: "flex", gap: 1 }}>
          <TBtn onClick={() => setVersionsOpen((v) => !v)} title="Histórico de versões" active={versionsOpen}>
            <Ico name="clock" />
          </TBtn>
          <TBtn onClick={() => setDupModal((m) => ({ ...m, open: true, slug: `${slug}-copia` }))} title="Duplicar campanha">
            <Ico name="copy" />
          </TBtn>
          <TBtn onClick={() => setLotsOpen(true)} title="Lotes & Cupons" color={lots.length > 0 ? "#F0A84A" : undefined} dot={lots.length > 0}>
            <Ico name="tag" />
          </TBtn>
          <TBtn onClick={() => setPricingOpen(true)} title="Tabela de preços">
            <Ico name="bar-chart" />
          </TBtn>
          <TBtn onClick={() => setMediaOpen(true)} title="Biblioteca de mídia">
            <Ico name="image" />
          </TBtn>
          <TBtn onClick={() => setPeriodsOpen(true)} title="Períodos & Datas">
            <Ico name="calendar" />
          </TBtn>
          <TBtn onClick={() => setDeployOpen(true)} title="Configurar deploy" active={!!deploy.mode} color={deploy.mode ? "#A67CFF" : undefined} dot={!!deploy.mode}>
            <Ico name="globe" />
          </TBtn>
        </div>

        <Divider />

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

                  {/* Bloco em branco — type personalizado */}
                  {blankInput === null ? (
                    <button onClick={() => setBlankInput("")} style={{
                      background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(166,124,255,0.3)",
                      borderRadius: 5, padding: "3px 7px", fontSize: 10, color: "#6B5FA0", cursor: "pointer",
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(166,124,255,0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    >
                      + em branco
                    </button>
                  ) : (
                    <input
                      autoFocus
                      value={blankInput}
                      placeholder="tipo…"
                      onChange={(e) => setBlankInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const t = blankInput.trim();
                          if (t) addBlock(t);
                          setBlankInput(null);
                        }
                        if (e.key === "Escape") setBlankInput(null);
                      }}
                      onBlur={() => {
                        const t = blankInput.trim();
                        if (t) addBlock(t);
                        setBlankInput(null);
                      }}
                      style={{
                        background: "rgba(166,124,255,0.08)", border: "1px solid rgba(166,124,255,0.4)",
                        borderRadius: 5, padding: "3px 7px", fontSize: 10, color: "#C4AEFF",
                        outline: "none", width: 90,
                      }}
                    />
                  )}
                </div>
              </div>
            </>
          ) : sidebarTab === "theme" ? (
            <ThemePanel theme={theme} onChange={updateTheme} saving={themeSaving} onSave={saveTheme} />
          ) : (
            <SeoPanel
              meta={meta}
              slug={slug}
              brandId={brandId}
              onChange={setMeta}
              onSave={() => saveMeta(meta)}
              saving={metaSaving}
            />
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
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
            <button
              onClick={() => {
                if (inspectorMode) {
                  iframeRef.current?.contentWindow?.postMessage({ type: "disable-element-picker" }, "*");
                  setInspectorMode(false);
                } else {
                  setPickedElement(null);
                  iframeRef.current?.contentWindow?.postMessage({ type: "enable-element-picker", blockIndex: -1 }, "*");
                  setInspectorMode(true);
                }
              }}
              title="Inspecionar elemento (global)"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 12px", borderRadius: 6, border: "none",
                background: inspectorMode ? "rgba(240,168,74,0.15)" : "transparent",
                color: inspectorMode ? "#F0A84A" : "#55526A",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!inspectorMode) e.currentTarget.style.color = "#F0EEF8"; }}
              onMouseLeave={(e) => { if (!inspectorMode) e.currentTarget.style.color = "#55526A"; }}
            >
              <span style={{ fontSize: 14 }}>◎</span>
              Inspecionar
            </button>
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
            {/* Floating inline toolbar — aparece ao clicar em texto no preview */}
            {pickedElement && pickedRect && (
              <FloatingInspector
                picked={pickedElement}
                rect={pickedRect}
                iframeRef={iframeRef}
                overrides={selectedBlock?._style?.elementOverrides ?? {}}
                onOverride={updateElementOverride}
                onClose={() => { setPickedElement(null); setPickedRect(null); }}
              />
            )}
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

              {pickedElement ? (
                /* ── MODO INSPECTOR ───────────────────── */
                <>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 44, display: "flex", alignItems: "center", padding: "0 12px", gap: 8, borderBottom: "1px solid rgba(240,168,74,0.15)", background: "rgba(240,168,74,0.04)", zIndex: 10 }}>
                    <span style={{ fontSize: 13, color: "#F0A84A" }}>◎</span>
                    <code style={{ fontSize: 12, color: "#F0A84A", fontWeight: 700, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pickedElement.tagName}{pickedElement.selector !== pickedElement.tagName ? `  ${pickedElement.selector}` : ""}
                    </code>
                    <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)", flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: "#55526A" }}>bloco: {selectedBlock.type}</span>
                    <div style={{ flex: 1 }} />
                    <button
                      onClick={() => { setPickedElement(null); setTab("visual"); }}
                      style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, color: "#8E8AA8", cursor: "pointer", fontSize: 11, padding: "3px 10px", fontWeight: 600 }}
                    >← Editar bloco</button>
                    <button onClick={() => { setDrawerOpen(false); setSelectedIdx(null); setPickedElement(null); }} style={{ background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 14, padding: "4px 6px" }}>✕</button>
                  </div>
                  <div style={{ position: "absolute", top: 44, left: 0, right: 0, bottom: 0, overflow: "auto" }}>
                    <InspectorPanel
                      picked={pickedElement}
                      overrides={selectedBlock._style?.elementOverrides ?? {}}
                      onOverride={updateElementOverride}
                      onPickAnother={() => {
                        setPickedElement(null);
                        iframeRef.current?.contentWindow?.postMessage({ type: "enable-element-picker", blockIndex: -1 }, "*");
                        setInspectorMode(true);
                      }}
                    />
                  </div>
                </>
              ) : (
                /* ── MODO NORMAL (tabs) ───────────────── */
                <>
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

                  {tab === "style" && (
                    <div style={{ position: "absolute", top: 44, left: 0, right: 0, bottom: 0, overflow: "auto", padding: 16 }}>
                      <BlockStylePanel
                        style={selectedBlock._style}
                        blockType={selectedBlock.type}
                        theme={theme}
                        elements={blockElements}
                        onChange={(patch) => updateBlockStyle(patch)}
                        onInspectElement={(el) => setPickedElement({
                          ...el,
                          blockIndex: selectedIdx ?? 0,
                          blockId: selectedBlock._id ?? "",
                        })}
                      />
                    </div>
                  )}

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

      <LotsPanel
        open={lotsOpen}
        onClose={() => setLotsOpen(false)}
        campaignId={campaignId}
        initialLots={lots}
        onSaved={(l) => setLots(l)}
      />

      <PricingPanel
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        campaignId={campaignId}
        brandId={brandId}
      />

      <MediaLibrary
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        brandId={brandId}
      />

      <PeriodsPanel
        open={periodsOpen}
        onClose={() => setPeriodsOpen(false)}
        campaignId={campaignId}
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
  tier:     ["regular", "premium"],
  scopeKey: ["3h", "all"],
};

const FIELD_LABELS: Record<string, string> = {
  eyebrow:         "Texto acima do título",
  headlineFull:    "Título completo",
  headlineEmphasis:"Palavra em destaque",
  headlineHtml:    "Título com formatação (HTML)",
  headline:        "Título",
  subtitle:        "Subtítulo",
  typewriter:      "Efeito de digitação",
  tag:             "Tag / Badge",
  note:            "Nota de rodapé",
  intro:           "Texto introdutório",
  tagline:         "Tagline da marca",
  copyright:       "Copyright",
  ageNotice:       "Aviso de idade",
  label:           "Texto do botão",
  href:            "Link (URL)",
  variant:         "Estilo / Cor",
  focusUnit:       "Focar na unidade",
  countdownTo:     "Contagem regressiva até (ISO)",
  primaryCta:      "Botão principal",
  ctas:            "Botões de ação",
  items:           "Itens",
  meta:            "Destaques",
  columns:         "Colunas de links",
  links:           "Links",
  icon:            "Ícone",
  body:            "Texto",
  highlight:       "Em destaque",
  value:           "Valor",
  units:           "IDs das unidades",
  wizardSteps:     "Passos do wizard",
  openCtaLabel:    "Botão abrir seleção",
  confirmCtaLabel: "Botão confirmar",
  stepCopy:        "Textos de cada passo",
  period:          "Período",
  date:            "Data",
  category:        "Suíte / Categoria",
  summary:         "Resumo da reserva",
  couponLine:      "Linha do cupom",
  lotLineNoCoupon: "Linha sem cupom",
  hint:            "Dica / subtexto",
  smallHint:       "Dica pequena",
  couponHint:      "Dica do cupom",
  n:               "Número do passo",
  video:           "Vídeo de fundo",
  src:             "Imagem",
  poster:          "Poster do vídeo",
};

function labelify(key: string) {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

/* Campos simples importantes aparecem antes de objetos e arrays */
const FIELD_PRIORITY = [
  "eyebrow", "headlineFull", "headlineEmphasis", "headlineHtml", "headline", "title",
  "subtitle", "tag", "intro", "tagline", "note", "copyright", "ageNotice",
  "typewriter", "video", "src", "poster", "body", "highlight", "value",
  "href", "label", "variant", "focusUnit", "openCtaLabel", "confirmCtaLabel", "countdownTo",
];

function fieldSortScore(key: string, val: unknown): number {
  const pri = FIELD_PRIORITY.indexOf(key);
  if (pri >= 0) return pri;                          // prioridade explícita
  if (Array.isArray(val)) return 1000;               // arrays por último
  if (typeof val === "object" && val !== null) return 500; // objetos penúltimos
  return 200;                                        // scalars não-prioritários no meio
}

function sortedEntries(data: Record<string, unknown>): [string, unknown][] {
  return Object.entries(data).sort(([ka, va], [kb, vb]) => fieldSortScore(ka, va) - fieldSortScore(kb, vb));
}

function deepKeyMatch(val: unknown, f: string): boolean {
  if (typeof val === "object" && val !== null && !Array.isArray(val)) {
    return Object.entries(val as Record<string, unknown>).some(([k, v]) => k.toLowerCase().includes(f) || deepKeyMatch(v, f));
  }
  if (Array.isArray(val)) return val.some((item) => deepKeyMatch(item, f));
  return false;
}

/* ── IconPickerField ────────────────────────────────── */
function IconPickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return BENEFIT_ICON_KEYS as readonly BenefitIconKey[];
    return BENEFIT_ICON_KEYS.filter((k) =>
      k.includes(q) || BENEFIT_ICON_LABELS[k].toLowerCase().includes(q)
    );
  }, [search]);

  const current = value as BenefitIconKey;

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...fieldStyle,
          display: "flex", alignItems: "center", gap: 8,
          cursor: "pointer", textAlign: "left",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
          style={{ width: 16, height: 16, flexShrink: 0 }}>
          {BENEFIT_ICON_PATHS[current]}
        </svg>
        <span style={{ flex: 1, fontSize: 12 }}>{BENEFIT_ICON_LABELS[current] ?? current}</span>
        <span style={{ fontSize: 10, color: "#55526A" }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "#1C1B27", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", padding: 10,
        }}>
          <input
            autoFocus
            placeholder="Buscar ícone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...fieldStyle, marginBottom: 8, width: "100%", boxSizing: "border-box" }}
          />
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4,
            maxHeight: 260, overflowY: "auto",
          }}>
            {filtered.map((k) => (
              <button
                key={k}
                type="button"
                title={BENEFIT_ICON_LABELS[k]}
                onClick={() => { onChange(k); setOpen(false); setSearch(""); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  padding: "6px 4px", borderRadius: 6, cursor: "pointer", border: "none",
                  background: k === current ? "rgba(166,124,255,0.18)" : "transparent",
                  outline: k === current ? "1px solid rgba(166,124,255,0.5)" : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { if (k !== current) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { if (k !== current) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
                  style={{ width: 18, height: 18, color: k === current ? "#A67CFF" : "#8E8AA8" }}>
                  {BENEFIT_ICON_PATHS[k]}
                </svg>
                <span style={{ fontSize: 9, color: "#55526A", textAlign: "center", lineHeight: 1.2 }}>
                  {BENEFIT_ICON_LABELS[k]}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: "span 5", fontSize: 11, color: "#3A3850", textAlign: "center", padding: 12 }}>
                Nenhum ícone encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  const entries = sortedEntries(data).filter(([key, val]) => {
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

            {key === "icon" ? (
              <IconPickerField value={String(val ?? "heart")} onChange={(v) => onChange(fullPath, v)} />

            ) : ENUM_OPTIONS[key] ? (
              <select value={String(val ?? "")} onChange={(e) => onChange(fullPath, e.target.value)} style={fieldStyle}>
                {ENUM_OPTIONS[key].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>

            ) : typeof val === "string" && key.endsWith("Html") ? (
              <RichTextField value={val} onChange={(v) => onChange(fullPath, v)} />

            ) : typeof val === "string" && MEDIA_KEY.test(key) ? (
              <ImageUploadField value={val} brandId={brandId} onChange={(url) => onChange(fullPath, url)} compact />

            ) : typeof val === "string" && val.length > 80 ? (
              <textarea value={val} onChange={(e) => onChange(fullPath, e.target.value)} style={fieldStyle} rows={3} />

            ) : typeof val === "string" ? (
              <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                {/^#[0-9a-fA-F]{3,8}$/.test(val) && (
                  <input type="color" value={val} onChange={(e) => onChange(fullPath, e.target.value)}
                    style={{ width: 34, padding: 2, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, cursor: "pointer", background: "none", flexShrink: 0 }} />
                )}
                <input type="text" value={val} onChange={(e) => onChange(fullPath, e.target.value)} style={{ ...fieldStyle, flex: 1 }} />
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


/* ── BlockStylePanel ────────────────────────────────── */
function BlockStylePanel({ style, onChange, blockType, theme, elements, onInspectElement }: {
  style?: BlockStyle;
  onChange: (patch: Partial<BlockStyle>) => void;
  blockType: string;
  theme?: Record<string, string>;
  elements?: BlockElement[];
  onInspectElement?: (el: BlockElement) => void;
}) {
  const s: BlockStyle = style ?? {};

  function update<K extends keyof BlockStyle>(key: K, val: BlockStyle[K]) {
    const next = { ...s };
    if (val === undefined || val === "" || val === 0) {
      delete (next as Record<string, unknown>)[key];
    } else {
      (next as Record<string, unknown>)[key] = val;
    }
    onChange(next);
  }

  function updateCssVar(key: string, val?: string) {
    const next = { ...(s.cssVars ?? {}) };
    if (val) { next[key] = val; } else { delete next[key]; }
    update("cssVars", Object.keys(next).length > 0 ? next : undefined);
  }

  const blockVars = BLOCK_CSS_VARS[blockType] ?? [];
  const hasAny = Object.values(s).some((v) => {
    if (typeof v === "object" && v !== null) return Object.keys(v).length > 0;
    return v !== undefined;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── ELEMENTOS DO BLOCO (computed styles do preview) ── */}
      {elements && elements.length > 0 && (
        <StyleSection title="Elementos do bloco">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {elements.map((el) => {
              const hasOverride = !!(style?.elementOverrides?.[el.selector]);
              const color = el.computedStyles["color"];
              const bg    = el.computedStyles["background-color"];
              const fs    = el.computedStyles["font-size"];
              const fw    = el.computedStyles["font-weight"];
              return (
                <div
                  key={el.selector}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                    background: hasOverride ? "rgba(240,168,74,0.06)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${hasOverride ? "rgba(240,168,74,0.2)" : "rgba(255,255,255,0.06)"}`,
                    transition: "border-color 0.1s",
                  }}
                  onClick={() => onInspectElement?.(el)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(166,124,255,0.35)"; e.currentTarget.style.background = "rgba(166,124,255,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = hasOverride ? "rgba(240,168,74,0.2)" : "rgba(255,255,255,0.06)"; e.currentTarget.style.background = hasOverride ? "rgba(240,168,74,0.06)" : "rgba(255,255,255,0.02)"; }}
                >
                  {/* Swatches de cor */}
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    {color && <div title={`color: ${color}`} style={{ width: 10, height: 10, borderRadius: "50%", background: color, border: "1px solid rgba(255,255,255,0.15)" }} />}
                    {bg    && <div title={`background: ${bg}`}  style={{ width: 10, height: 10, borderRadius: "50%", background: bg,    border: "1px solid rgba(255,255,255,0.15)" }} />}
                  </div>
                  {/* Selector */}
                  <code style={{ fontSize: 10, color: "#C4AEFF", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {el.tagName}{el.selector !== el.tagName ? `  ${el.selector}` : ""}
                  </code>
                  {/* Font summary */}
                  {fs && <span style={{ fontSize: 9, color: "#55526A", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fs}{fw && fw !== "400" ? ` / ${fw}` : ""}</span>}
                  {/* Editar arrow */}
                  <span style={{ fontSize: 10, color: hasOverride ? "#F0A84A" : "#3A3850", flexShrink: 0 }}>
                    {hasOverride ? "✦" : "→"}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 9, color: "#3A3850", marginTop: 6, lineHeight: 1.5 }}>
            Clique para abrir o inspector e editar os estilos desse elemento.
          </div>
        </StyleSection>
      )}

      {elements && elements.length === 0 && (
        <div style={{ fontSize: 10, color: "#3A3850", textAlign: "center", padding: "12px 0 8px", lineHeight: 1.6 }}>
          Clique no bloco no preview para carregar os elementos.
        </div>
      )}

      {/* Overrides de elemento existentes */}
      {style?.elementOverrides && Object.keys(style.elementOverrides).length > 0 && (
        <div style={{ marginBottom: 16, padding: "8px 10px", borderRadius: 6, background: "rgba(240,168,74,0.05)", border: "1px solid rgba(240,168,74,0.15)" }}>
          <div style={{ fontSize: 9, color: "#8E8AA8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#F0A84A" }}>◎</span> Elementos estilizados
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {Object.entries(style.elementOverrides).map(([sel, props]) => (
              <div key={sel} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <code style={{ fontSize: 10, color: "#C4AEFF" }}>{sel}</code>
                <span style={{ fontSize: 9, color: "#55526A" }}>{Object.keys(props).length} prop{Object.keys(props).length !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: "#3A3850", marginTop: 6 }}>Use ◎ Inspecionar na toolbar para editar.</div>
        </div>
      )}

      {/* ── CORES DO BLOCO ── */}
      {blockVars.length > 0 && (
        <StyleSection title={`Cores — ${blockType}`}>
          {blockVars.map(({ key, label }) => (
            <ColorRow
              key={key}
              label={label}
              value={s.cssVars?.[key]}
              inherited={theme?.[key]}
              onChange={(v) => updateCssVar(key, v)}
            />
          ))}
          <div style={{ fontSize: 9, color: "#3A3850", marginTop: 4, lineHeight: 1.5 }}>
            Valor atual do tema em cinza. Clique para sobrescrever só neste bloco.
          </div>
        </StyleSection>
      )}

      {/* ── ESPAÇAMENTO ── */}
      <StyleSection title="Espaçamento">
        <div style={{
          display: "grid",
          gridTemplateColumns: "52px 1fr 52px",
          gridTemplateRows: "auto auto auto",
          gap: 6, alignItems: "center", justifyItems: "center",
          margin: "2px 0 8px",
        }}>
          <div />
          <SpacingInput label="Acima" value={s.paddingTop ?? 0}
            onChange={(v) => update("paddingTop", v || undefined)} />
          <div />

          <SpacingInput label="Esq." value={s.paddingLeft ?? 0}
            onChange={(v) => update("paddingLeft", v || undefined)} />
          <div style={{
            width: "100%", height: 44, borderRadius: 6,
            border: "1.5px dashed rgba(166,124,255,0.18)",
            background: "rgba(166,124,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 9, color: "#3A3850", textTransform: "uppercase", letterSpacing: "0.1em" }}>bloco</span>
          </div>
          <SpacingInput label="Dir." value={s.paddingRight ?? 0}
            onChange={(v) => update("paddingRight", v || undefined)} />

          <div />
          <SpacingInput label="Abaixo" value={s.paddingBottom ?? 0}
            onChange={(v) => update("paddingBottom", v || undefined)} />
          <div />
        </div>
        <div style={{ fontSize: 9, color: "#3A3850", textAlign: "center" }}>Espaçamento interno em pixels</div>
      </StyleSection>

      {/* ── APARÊNCIA ── */}
      <StyleSection title="Aparência">
        <ColorRow label="Fundo"  value={s.bg}    onChange={(v) => update("bg", v)} />
        <ColorRow label="Texto"  value={s.color} onChange={(v) => update("color", v)} />

        {/* Opacidade */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: "#8E8AA8", minWidth: 44, textTransform: "uppercase", letterSpacing: "0.07em" }}>Opac.</span>
          <input type="range" min={10} max={100} step={5}
            value={s.opacity ?? 100}
            onChange={(e) => { const v = Number(e.target.value); update("opacity", v === 100 ? undefined : v); }}
            style={{ flex: 1, accentColor: "#A67CFF", cursor: "pointer" }}
          />
          <span style={{
            fontSize: 11, fontWeight: 600, minWidth: 36, textAlign: "right",
            color: (s.opacity ?? 100) < 100 ? "#A67CFF" : "#3A3850",
            fontVariantNumeric: "tabular-nums",
          }}>{s.opacity ?? 100}%</span>
        </div>

        {/* Raio de borda */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#8E8AA8", minWidth: 44, textTransform: "uppercase", letterSpacing: "0.07em" }}>Raio</span>
          <input type="range" min={0} max={48} step={2}
            value={s.borderRadius ?? 0}
            onChange={(e) => update("borderRadius", Number(e.target.value) || undefined)}
            style={{ flex: 1, accentColor: "#A67CFF", cursor: "pointer" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 54 }}>
            <div style={{
              width: 14, height: 14, flexShrink: 0,
              border: "1.5px solid rgba(166,124,255,0.4)",
              borderRadius: Math.min(s.borderRadius ?? 0, 7),
              background: "rgba(166,124,255,0.08)",
              transition: "border-radius 0.12s",
            }} />
            <span style={{
              fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: (s.borderRadius ?? 0) > 0 ? "#A67CFF" : "#3A3850",
            }}>{s.borderRadius ?? 0}px</span>
          </div>
        </div>
      </StyleSection>

      {/* ── RESET ── */}
      {hasAny && (
        <button
          onClick={() => onChange({
            cssVars: undefined,
            elementOverrides: undefined,
            bg: undefined, color: undefined,
            paddingTop: undefined, paddingBottom: undefined,
            paddingLeft: undefined, paddingRight: undefined,
            borderRadius: undefined, opacity: undefined,
          })}
          style={{
            width: "100%", marginTop: 4,
            background: "rgba(224,82,96,0.07)", border: "1px solid rgba(224,82,96,0.18)",
            borderRadius: 6, padding: "8px 0", color: "#E05260",
            cursor: "pointer", fontSize: 11, fontWeight: 600,
          }}
        >
          Resetar estilos deste bloco
        </button>
      )}
    </div>
  );
}

/* ── InspectorPanel ─────────────────────────────────── */
const INSPECTOR_GROUPS: { label: string; grid?: boolean; props: { prop: string; label: string; color?: boolean }[] }[] = [
  { label: "Texto", props: [
    { prop: "color",          label: "Cor",        color: true },
    { prop: "font-size",      label: "Tamanho" },
    { prop: "font-weight",    label: "Peso" },
    { prop: "font-family",    label: "Família" },
    { prop: "line-height",    label: "Altura linha" },
    { prop: "letter-spacing", label: "Kerning" },
    { prop: "text-transform", label: "Transform" },
    { prop: "text-decoration",label: "Decoração" },
    { prop: "text-shadow",    label: "Sombra" },
  ]},
  { label: "Fundo", props: [
    { prop: "background-color", label: "Cor de fundo", color: true },
    { prop: "opacity",          label: "Opacidade" },
  ]},
  { label: "Borda", props: [
    { prop: "border-color",  label: "Cor",      color: true },
    { prop: "border-width",  label: "Espessura" },
    { prop: "border-style",  label: "Estilo" },
    { prop: "border-radius", label: "Raio" },
  ]},
  { label: "Sombra", props: [
    { prop: "box-shadow", label: "Box shadow" },
  ]},
  { label: "Padding", grid: true, props: [
    { prop: "padding-top",    label: "↑" },
    { prop: "padding-right",  label: "→" },
    { prop: "padding-bottom", label: "↓" },
    { prop: "padding-left",   label: "←" },
  ]},
  { label: "Margin", grid: true, props: [
    { prop: "margin-top",    label: "↑" },
    { prop: "margin-right",  label: "→" },
    { prop: "margin-bottom", label: "↓" },
    { prop: "margin-left",   label: "←" },
  ]},
];

function InspectorPanel({
  picked, overrides, onOverride, onPickAnother,
}: {
  picked: { blockIndex: number; blockId: string; selector: string; computedStyles: Record<string, string>; tagName: string; };
  overrides: Record<string, Record<string, string>>;
  onOverride: (selector: string, property: string, value: string) => void;
  onPickAnother: () => void;
}) {
  const currentOverrides = overrides[picked.selector] ?? {};
  const overrideCount = Object.keys(currentOverrides).length;

  return (
    <div style={{ padding: "12px 16px 20px" }}>
      {/* Actions row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button
          onClick={onPickAnother}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(240,168,74,0.25)",
            background: "rgba(240,168,74,0.08)", color: "#F0A84A",
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}
        >
          <span>◎</span> Selecionar outro
        </button>
        {overrideCount > 0 && (
          <button
            onClick={() => Object.keys(currentOverrides).forEach((p) => onOverride(picked.selector, p, ""))}
            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(224,82,96,0.2)", background: "rgba(224,82,96,0.07)", color: "#E05260", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            Limpar {overrideCount} override{overrideCount !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Style groups */}
      {INSPECTOR_GROUPS.map(({ label, props, grid }) => {
        const visible = props.filter((p) => picked.computedStyles[p.prop] || currentOverrides[p.prop]);
        if (visible.length === 0) return null;

        return (
          <div key={label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "#3A3850", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {label}
            </div>
            {grid ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {visible.map((p) => (
                  <InspectorRow key={p.prop} prop={p.prop} label={p.label} color={p.color}
                    computed={picked.computedStyles[p.prop]}
                    override={currentOverrides[p.prop]}
                    selector={picked.selector} onOverride={onOverride} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {visible.map((p) => (
                  <InspectorRow key={p.prop} prop={p.prop} label={p.label} color={p.color}
                    computed={picked.computedStyles[p.prop]}
                    override={currentOverrides[p.prop]}
                    selector={picked.selector} onOverride={onOverride} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* All properties are unset hint */}
      {INSPECTOR_GROUPS.every(({ props }) => props.every((p) => !picked.computedStyles[p.prop] && !currentOverrides[p.prop])) && (
        <div style={{ fontSize: 11, color: "#3A3850", textAlign: "center", padding: "20px 0" }}>
          Nenhuma propriedade CSS relevante detectada neste elemento.
        </div>
      )}
    </div>
  );
}

function InspectorRow({ prop, label, color, computed, override, selector, onOverride }: {
  prop: string; label: string; color?: boolean;
  computed?: string; override?: string;
  selector: string; onOverride: (selector: string, property: string, value: string) => void;
}) {
  const isSet = !!override;
  const displayValue = override ?? computed ?? "";
  const textColor = isSet ? "#F0A84A" : computed ? "#C8C5E0" : "#3A3850";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 9, color: "#55526A", minWidth: 70, flexShrink: 0, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
        {label}
      </span>
      <div style={{
        flex: 1, display: "flex", alignItems: "center", height: 26,
        background: "#16161F",
        border: `1px solid ${isSet ? "rgba(240,168,74,0.45)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 5, overflow: "hidden",
      }}>
        {color && (
          <label style={{ position: "relative", width: 26, height: 26, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{
              width: 13, height: 13, borderRadius: 2,
              background: override || computed || "#888",
              border: "1px solid rgba(255,255,255,0.15)",
            }} />
            <input type="color"
              value={override || computed || "#888888"}
              onChange={(e) => onOverride(selector, prop, e.target.value)}
              style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer", width: "100%", height: "100%" }}
            />
          </label>
        )}
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onOverride(selector, prop, e.target.value)}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            color: textColor,
            fontSize: 11, padding: "0 6px", height: 26,
            fontFamily: "monospace",
          }}
        />
        {isSet && (
          <button
            onClick={() => onOverride(selector, prop, "")}
            title="Remover override"
            style={{ background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 11, padding: "0 6px", flexShrink: 0, lineHeight: 1 }}
          >✕</button>
        )}
      </div>
    </div>
  );
}

function StyleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.12em", color: "#3A3850",
        marginBottom: 12, paddingBottom: 6,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>{title}</div>
      {children}
    </div>
  );
}

function SpacingInput({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  const active = value > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span style={{
        fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em",
        color: active ? "#A67CFF" : "#3A3850",
      }}>{label}</span>
      <input
        type="number" min={0} max={400} step={4}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        style={{
          width: 44, textAlign: "center", outline: "none",
          background: active ? "rgba(166,124,255,0.1)" : "#16161F",
          border: `1px solid ${active ? "rgba(166,124,255,0.35)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 5, padding: "5px 0",
          color: active ? "#C4AEFF" : "#55526A",
          fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums",
        }}
      />
    </div>
  );
}

function ColorRow({ label, value, inherited, onChange }: {
  label: string; value?: string; inherited?: string; onChange: (v?: string) => void;
}) {
  const isSet = !!value;
  const displayColor = value || inherited;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 10, color: "#8E8AA8", minWidth: 44, textTransform: "uppercase", letterSpacing: "0.07em", lineHeight: 1.3 }}>{label}</span>
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        background: "#16161F",
        border: `1px solid ${isSet ? "rgba(240,168,74,0.4)" : inherited ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 6, overflow: "hidden",
      }}>
        {/* Swatch — mostra valor override (âmbar) ou herdado (cinza) */}
        <label style={{ position: "relative", width: 32, height: 30, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 18, height: 18, borderRadius: 3,
            background: displayColor ?? undefined,
            backgroundImage: displayColor ? undefined : "repeating-conic-gradient(#2A2838 0% 25%, #16161F 0% 50%)",
            backgroundSize: displayColor ? undefined : "6px 6px",
            border: `1px solid ${isSet ? "rgba(240,168,74,0.5)" : "rgba(255,255,255,0.12)"}`,
            boxShadow: displayColor ? "0 1px 4px rgba(0,0,0,0.4)" : undefined,
            opacity: isSet ? 1 : 0.6,
          }} />
          <input type="color" value={value || inherited || "#000000"} onChange={(e) => onChange(e.target.value)}
            style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer", width: "100%", height: "100%" }} />
        </label>
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />
        <input
          type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={inherited ?? "—"}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            color: isSet ? "#F0A84A" : "#3A3850",
            fontSize: 12, padding: "0 8px", height: 30,
            fontFamily: "monospace",
          }}
        />
        {isSet && (
          <button onClick={() => onChange(undefined)} title="Remover override — volta ao tema"
            style={{ background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 11, padding: "0 8px", height: 30, flexShrink: 0 }}>✕</button>
        )}
      </div>
      {/* Badge "tema" quando não há override mas há valor herdado */}
      {!isSet && inherited && (
        <span style={{ fontSize: 8, color: "#3A3850", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 3, padding: "1px 5px", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>tema</span>
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

/* ── Toolbar primitives ─────────────────────────────── */
function Divider() {
  return <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />;
}

function TBtn({ children, onClick, disabled, title, active, color, dot }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
  color?: string;
  dot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = active ? "rgba(166,124,255,0.22)" : "rgba(255,255,255,0.07)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = active ? "rgba(166,124,255,0.14)" : "transparent"; }}
      style={{
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, borderRadius: 6, border: "none", flexShrink: 0,
        background: active ? "rgba(166,124,255,0.14)" : "transparent",
        color: disabled ? "#282535" : color ?? "#6B6785",
        cursor: disabled ? "default" : "pointer",
        transition: "color 0.1s",
      }}
    >
      {children}
      {dot && (
        <span style={{
          position: "absolute", top: 5, right: 5,
          width: 5, height: 5, borderRadius: "50%",
          background: color ?? "#F0A84A",
          boxShadow: `0 0 5px ${color ?? "#F0A84A"}60`,
        }} />
      )}
    </button>
  );
}

function Ico({ name, size = 15 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "undo":        return <svg {...p}><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>;
    case "redo":        return <svg {...p}><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 0 4-4h12"/></svg>;
    case "clock":       return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case "copy":        return <svg {...p}><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>;
    case "tag":         return <svg {...p}><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>;
    case "bar-chart":   return <svg {...p}><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>;
    case "image":       return <svg {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
    case "calendar":    return <svg {...p}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>;
    case "globe":       return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>;
    case "plus":        return <svg {...p}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
    case "check":       return <svg {...p}><path d="M20 6 9 17l-5-5"/></svg>;
    default:            return null;
  }
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
