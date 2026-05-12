"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { LayoutPicker } from "./LayoutPicker";
import { ComponentGallery } from "./ComponentGallery";
import { EffectGallery } from "./EffectGallery";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Tab = "blocks" | "layouts" | "components" | "effects";
type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

interface Props {
  campaignId: string;
  brandId: string;
  slug: string;
  initialJson: string;
  status: string;
}

export function CampaignEditor({ campaignId, brandId, slug, initialJson, status }: Props) {
  const [json, setJson] = useState(initialJson);
  const [tab, setTab] = useState<Tab>("blocks");
  const [device, setDevice] = useState<Device>("desktop");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSave(json, false), 1500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json]);

  async function handleSave(value: string, publish: boolean) {
    setSaving(true);
    setError(null);
    try {
      let parsed: unknown;
      try { parsed = JSON.parse(value); } catch { throw new Error("JSON inválido — verifique a sintaxe."); }
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_data: parsed, ...(publish ? { status: "published" } : {}) }),
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
  }

  const insertSnippet = useCallback((snippet: string) => {
    try {
      const current = JSON.parse(json);
      const inserted = JSON.parse(snippet);
      if (Array.isArray(current.blocks)) {
        current.blocks.push(inserted);
        setJson(JSON.stringify(current, null, 2));
      }
    } catch {
      // se não der pra inserir, cola no final como texto
      setJson((prev) => prev.slice(0, -1) + ",\n" + snippet + "\n}");
    }
  }, [json]);

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "#0D0D12" }}>

      {/* ── LEFT PANEL ─────────────────────────────────── */}
      <div style={{ width: 260, borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          {(["blocks","layouts","components","effects"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "10px 4px", fontSize: 10, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em", border: "none",
                background: tab === t ? "#16161F" : "transparent",
                color: tab === t ? "#A67CFF" : "#55526A",
                cursor: "pointer", transition: "color 0.12s",
                borderBottom: tab === t ? "2px solid #A67CFF" : "2px solid transparent",
              }}
            >
              {t === "blocks" ? "Blocos" : t === "layouts" ? "Layouts" : t === "components" ? "UI" : "Efeitos"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          {tab === "blocks" && <BlockList json={json} onSelect={(block) => setJson(highlightBlock(json, block))} />}
          {tab === "layouts" && <LayoutPicker onInsert={insertSnippet} />}
          {tab === "components" && <ComponentGallery onInsert={insertSnippet} />}
          {tab === "effects" && <EffectGallery onInsert={insertSnippet} />}
        </div>
      </div>

      {/* ── CENTER: MONACO ─────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{
          height: 48, borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#F0EEF8" }}>{slug}</span>
            <span style={{ fontSize: 11, color: "#55526A", marginLeft: 8 }}>{brandId}</span>
          </div>

          {error && <span style={{ fontSize: 12, color: "#E05260", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{error}</span>}
          {saved && <span style={{ fontSize: 12, color: "#2EB87A" }}>Salvo ✓</span>}
          {saving && <span style={{ fontSize: 12, color: "#8E8AA8" }}>Salvando…</span>}

          <button
            onClick={() => handleSave(json, true)}
            disabled={saving}
            style={{
              background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6,
              padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Publicar
          </button>
        </div>

        {/* Monaco */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <MonacoEditor
            height="100%"
            defaultLanguage="json"
            theme="vs-dark"
            value={json}
            onChange={(v) => setJson(v ?? "")}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              wordWrap: "on",
              formatOnPaste: true,
              tabSize: 2,
              scrollBeyondLastLine: false,
              renderLineHighlight: "gutter",
              bracketPairColorization: { enabled: true },
            }}
          />
        </div>
      </div>

      {/* ── RIGHT: PREVIEW ─────────────────────────────── */}
      <div style={{ width: 480, borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Device switcher */}
        <div style={{
          height: 48, borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexShrink: 0,
        }}>
          {(["desktop","tablet","mobile"] as Device[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              title={d}
              style={{
                background: device === d ? "rgba(166,124,255,0.15)" : "transparent",
                border: "1px solid",
                borderColor: device === d ? "#A67CFF" : "rgba(255,255,255,0.08)",
                borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                color: device === d ? "#A67CFF" : "#55526A", fontSize: 12,
              }}
            >
              {d === "desktop" ? "🖥" : d === "tablet" ? "📱" : "📲"}
            </button>
          ))}
          <span style={{ fontSize: 11, color: "#55526A", marginLeft: 4 }}>Preview ao vivo</span>
        </div>

        {/* iframe container */}
        <div style={{ flex: 1, overflow: "hidden", background: "#111", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: device !== "desktop" ? "16px 0" : 0 }}>
          <div style={{ width: DEVICE_WIDTH[device], height: "100%", transition: "width 0.3s", overflow: "hidden", boxShadow: device !== "desktop" ? "0 0 0 1px rgba(255,255,255,0.1)" : "none", borderRadius: device !== "desktop" ? 8 : 0 }}>
            <iframe
              key={previewKey}
              src={`/${brandId}/${slug}?preview=1`}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Block list (tab Blocos) ─────────────────────────── */
function BlockList({ json, onSelect }: { json: string; onSelect: (block: string) => void }) {
  let blocks: { type: string }[] = [];
  try { blocks = JSON.parse(json)?.blocks ?? []; } catch { /* noop */ }
  if (!blocks.length) return <p style={{ fontSize: 12, color: "#55526A", textAlign: "center", marginTop: 24 }}>Nenhum bloco no JSON.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {blocks.map((b, i) => (
        <button
          key={i}
          onClick={() => onSelect(b.type)}
          style={{
            background: "#16161F", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8, padding: "8px 12px", textAlign: "left", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>{BLOCK_ICON[b.type] ?? "📦"}</span>
          <span style={{ fontSize: 12, color: "#F0EEF8", fontWeight: 500 }}>{b.type}</span>
          <span style={{ fontSize: 10, color: "#55526A", marginLeft: "auto" }}>#{i + 1}</span>
        </button>
      ))}
    </div>
  );
}

const BLOCK_ICON: Record<string, string> = {
  nav: "🔝", hero: "🎯", benefits: "✨", unitPicker: "🛏",
  offer: "💰", faq: "❓", footer: "🔚", stickyCta: "📌",
};

function highlightBlock(json: string, _type: string) { return json; }
