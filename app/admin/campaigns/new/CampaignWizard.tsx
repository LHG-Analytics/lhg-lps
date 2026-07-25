"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BLANK_TEMPLATE, CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/lib/campaign-templates";

interface Brand { id: string; name: string; domain?: string }
interface Props { brands: Brand[] }
type Step = 1 | 2 | 3

const fld: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "8px 12px", color: "#F0EEF8", fontSize: 13,
  outline: "none", fontFamily: "inherit",
}

// ── Category badge colours ──────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  conversao: "#2EB87A", gastronomia: "#F0A84A", informacional: "#5B9BD5",
  oferta: "#E05260", storytelling: "#A67CFF", blank: "#55526A",
}

// ── BlockWireframe (compact, used in Step 3 summary) ───────────────────────

interface BlockVisual { color: string; border: string; weight: number }
const BLOCK_VISUAL: Record<string, BlockVisual> = {
  nav:        { color: "rgba(166,124,255,0.14)", border: "rgba(166,124,255,0.45)", weight: 3  },
  hero:       { color: "rgba(79,180,138,0.13)",  border: "rgba(79,180,138,0.4)",   weight: 22 },
  feature:    { color: "rgba(79,180,138,0.08)",  border: "rgba(79,180,138,0.28)",  weight: 12 },
  benefits:   { color: "rgba(79,180,138,0.06)",  border: "rgba(79,180,138,0.22)",  weight: 10 },
  menuGrid:   { color: "rgba(120,100,220,0.12)", border: "rgba(120,100,220,0.38)", weight: 11 },
  priceCards: { color: "rgba(240,168,74,0.1)",   border: "rgba(240,168,74,0.35)",  weight: 12 },
  unitPicker: { color: "rgba(46,135,220,0.12)",  border: "rgba(46,135,220,0.38)",  weight: 18 },
  offer:      { color: "rgba(240,168,74,0.07)",  border: "rgba(240,168,74,0.25)",  weight: 10 },
  faq:        { color: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.15)", weight: 9  },
  footer:     { color: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.1)",  weight: 6  },
  stickyCta:  { color: "rgba(166,124,255,0.22)", border: "rgba(166,124,255,0.6)",  weight: 3  },
}
const FB = { color: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.12)", weight: 6 }

function BlockWireframe({ blockTypes, height = 120 }: { blockTypes: string[]; height?: number }) {
  if (!blockTypes.length) {
    return (
      <div style={{ height, borderRadius: 6, border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 10, color: "#3A3850", letterSpacing: "0.08em" }}>SEM BLOCOS</span>
      </div>
    )
  }
  const total = blockTypes.reduce((s, t) => s + (BLOCK_VISUAL[t]?.weight ?? FB.weight), 0)
  return (
    <div style={{ height, display: "flex", flexDirection: "column", gap: 1.5, borderRadius: 6, overflow: "hidden" }}>
      {blockTypes.map((t, i) => {
        const v = BLOCK_VISUAL[t] ?? FB
        const pct = (v.weight / total) * 100
        return (
          <div key={i} style={{ flex: `0 0 calc(${pct}% - 1.5px)`, minHeight: 4, background: v.color, borderLeft: `2px solid ${v.border}`, borderRadius: "0 2px 2px 0", display: "flex", alignItems: "center", paddingLeft: 6, overflow: "hidden" }}>
            {pct > 6 && <span style={{ fontSize: 6.5, color: v.border, fontWeight: 800, letterSpacing: "0.1em", whiteSpace: "nowrap", opacity: 0.9 }}>{t.toUpperCase()}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── TemplateMockup (visual CSS preview used in picker modal) ───────────────

// Heights in the 300px-wide design space
const MH: Record<string, number> = {
  nav: 24, hero: 100, feature: 56, benefits: 64, menuGrid: 72,
  priceCards: 68, unitPicker: 80, offer: 60, faq: 58, footer: 50, stickyCta: 14,
}

type BlockRenderer = () => React.ReactElement

const BR: Record<string, BlockRenderer> = {
  nav: () => (
    <div style={{ height: 24, background: "rgba(8,8,16,0.98)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#A67CFF" }} />
        <div style={{ width: 22, height: 4, background: "rgba(255,255,255,0.65)", borderRadius: 2 }} />
      </div>
      <div style={{ width: 44, height: 4, background: "rgba(166,124,255,0.3)", borderRadius: 10, border: "1px solid rgba(166,124,255,0.4)" }} />
    </div>
  ),

  hero: () => (
    <div style={{ height: 100, background: "linear-gradient(150deg, #091610 0%, #132618 60%, #1A2E20 100%)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 14px 14px" }}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "55%", background: "linear-gradient(to left, rgba(46,120,90,0.25) 0%, transparent 100%)" }} />
      <div style={{ position: "relative" }}>
        <div style={{ width: 50, height: 3, background: "rgba(166,124,255,0.7)", borderRadius: 2, marginBottom: 5 }} />
        <div style={{ width: 112, height: 8, background: "rgba(255,255,255,0.85)", borderRadius: 2, marginBottom: 3 }} />
        <div style={{ width: 76, height: 7, background: "rgba(201,167,245,0.6)", borderRadius: 2, marginBottom: 9 }} />
        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <div style={{ height: 16, padding: "0 10px", background: "rgba(166,124,255,0.25)", border: "1px solid rgba(166,124,255,0.5)", borderRadius: 8, display: "flex", alignItems: "center" }}>
            <div style={{ width: 30, height: 3, background: "rgba(255,255,255,0.6)", borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: i === 0 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)" }} />)}
          </div>
        </div>
      </div>
    </div>
  ),

  feature: () => (
    <div style={{ height: 56, background: "#0E2217", display: "flex" }}>
      <div style={{ flex: 1, padding: "8px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
        <div style={{ width: 36, height: 2.5, background: "rgba(166,124,255,0.5)", borderRadius: 2 }} />
        <div style={{ width: 65, height: 5.5, background: "rgba(255,255,255,0.7)", borderRadius: 2 }} />
        {[100, 90, 80].map((w, i) => <div key={i} style={{ width: w + "%", height: 2.5, background: "rgba(255,255,255,0.18)", borderRadius: 2 }} />)}
      </div>
      <div style={{ width: "42%", position: "relative", background: "rgba(79,180,138,0.07)" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(79,180,138,0.12) 0%, rgba(46,120,90,0.2) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 18, height: 14, borderRadius: 2, border: "1.5px solid rgba(255,255,255,0.15)" }} />
        </div>
      </div>
    </div>
  ),

  benefits: () => (
    <div style={{ height: 64, background: "#112A1C", padding: "8px 14px" }}>
      <div style={{ width: 45, height: 4, background: "rgba(255,255,255,0.55)", borderRadius: 2, marginBottom: 7 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 3, padding: "5px 4px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(166,124,255,0.28)", marginBottom: 3 }} />
            <div style={{ width: "65%", height: 2.5, background: "rgba(255,255,255,0.3)", borderRadius: 2, marginBottom: 2 }} />
            <div style={{ width: "85%", height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 2 }} />
          </div>
        ))}
      </div>
    </div>
  ),

  menuGrid: () => (
    <div style={{ height: 72, background: "#0D1420", padding: "8px 14px" }}>
      <div style={{ width: 55, height: 5, background: "rgba(255,255,255,0.6)", borderRadius: 2, marginBottom: 7 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {[0,1].map(i => (
          <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 3, padding: "5px 5px" }}>
            <div style={{ width: 22, height: 3, background: "rgba(120,100,220,0.7)", borderRadius: 2, marginBottom: 3 }} />
            <div style={{ width: "75%", height: 5, background: "rgba(255,255,255,0.5)", borderRadius: 2, marginBottom: 3 }} />
            {[90, 70].map((w, j) => <div key={j} style={{ width: w + "%", height: 2, background: "rgba(255,255,255,0.12)", borderRadius: 2, marginBottom: 1.5 }} />)}
          </div>
        ))}
      </div>
    </div>
  ),

  priceCards: () => (
    <div style={{ height: 68, background: "linear-gradient(150deg, #180D24 0%, #1E1030 100%)", padding: "8px 14px" }}>
      <div style={{ width: 65, height: 4, background: "rgba(255,255,255,0.55)", borderRadius: 2, marginBottom: 7, margin: "0 auto 7px" }} />
      <div style={{ display: "flex", gap: 4 }}>
        {[false, true, false].map((hi, i) => (
          <div key={i} style={{ flex: 1, background: hi ? "rgba(166,124,255,0.15)" : "rgba(255,255,255,0.04)", borderRadius: 3, padding: "5px 4px", border: `1px solid ${hi ? "rgba(166,124,255,0.45)" : "rgba(255,255,255,0.08)"}` }}>
            <div style={{ width: "50%", height: 2.5, background: "rgba(240,168,74,0.65)", borderRadius: 2, marginBottom: 3 }} />
            <div style={{ width: "85%", height: 4.5, background: hi ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.4)", borderRadius: 2, marginBottom: 3 }} />
            <div style={{ width: "75%", height: 6, background: hi ? "rgba(166,124,255,0.5)" : "rgba(255,255,255,0.15)", borderRadius: 2 }} />
          </div>
        ))}
      </div>
    </div>
  ),

  unitPicker: () => {
    const steps = [0,1,2,3]
    return (
      <div style={{ height: 80, background: "#0A1520", padding: "8px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 7 }}>
          {steps.flatMap((n, i) => {
            const dot = (
              <div key={`d${n}`} style={{ width: 12, height: 12, borderRadius: "50%", background: n === 0 ? "#A67CFF" : "rgba(255,255,255,0.08)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {n === 0 && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff" }} />}
              </div>
            )
            return i < steps.length - 1
              ? [dot, <div key={`l${n}`} style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />]
              : [dot]
          })}
        </div>
        {[0,1].map(i => (
          <div key={i} style={{ height: 20, borderRadius: 3, background: "rgba(255,255,255,0.04)", border: `1px solid ${i===0 ? "rgba(46,135,220,0.45)" : "rgba(255,255,255,0.07)"}`, display: "flex", alignItems: "center", gap: 6, padding: "0 7px", marginBottom: 4 }}>
            <div style={{ width: 24, height: 12, borderRadius: 2, background: "rgba(79,180,138,0.18)", flexShrink: 0 }} />
            <div style={{ width: "55%", height: 3.5, background: "rgba(255,255,255,0.45)", borderRadius: 2 }} />
            {i === 0 && <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", border: "1.5px solid rgba(46,135,220,0.6)" }} />}
          </div>
        ))}
      </div>
    )
  },

  offer: () => (
    <div style={{ height: 60, background: "#0A1A10", padding: "8px 14px", textAlign: "center" }}>
      <div style={{ width: 48, height: 3.5, background: "rgba(240,168,74,0.65)", borderRadius: 2, margin: "0 auto 5px" }} />
      <div style={{ width: 95, height: 7, background: "rgba(255,255,255,0.6)", borderRadius: 2, margin: "0 auto 7px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
        {[80, 70, 85].map((w, i) => <div key={i} style={{ width: w + "%", height: 2.5, background: "rgba(255,255,255,0.14)", borderRadius: 2 }} />)}
      </div>
    </div>
  ),

  faq: () => (
    <div style={{ height: 58, background: "#0A1A10", padding: "6px 14px" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "4.5px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ width: `${45 + i*13}%`, height: 3.5, background: "rgba(255,255,255,0.3)", borderRadius: 2 }} />
          <div style={{ width: 9, height: 9, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.18)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 3.5, height: 3.5, borderRadius: "50%", background: "rgba(166,124,255,0.65)" }} />
          </div>
        </div>
      ))}
    </div>
  ),

  footer: () => (
    <div style={{ height: 50, background: "#060608", padding: "7px 14px" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 5 }}>
        <div style={{ flex: 1.5 }}>
          <div style={{ width: 28, height: 5, background: "rgba(255,255,255,0.4)", borderRadius: 2, marginBottom: 4 }} />
          {[1,2].map(i => <div key={i} style={{ width: `${50 + i*15}%`, height: 2.5, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginBottom: 2 }} />)}
        </div>
        {[0,1].map(col => (
          <div key={col} style={{ flex: 1 }}>
            <div style={{ width: "45%", height: 3, background: "rgba(255,255,255,0.22)", borderRadius: 2, marginBottom: 3 }} />
            {[0,1,2].map(j => <div key={j} style={{ width: `${35 + j*10}%`, height: 2, background: "rgba(255,255,255,0.09)", borderRadius: 2, marginBottom: 2 }} />)}
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
    </div>
  ),

  stickyCta: () => (
    <div style={{ height: 14, background: "rgba(8,8,20,0.97)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, borderTop: "1px solid rgba(166,124,255,0.18)" }}>
      <div style={{ width: 58, height: 7, background: "rgba(166,124,255,0.4)", borderRadius: 4 }} />
      <div style={{ width: 3.5, height: 3.5, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
      <div style={{ width: 45, height: 7, background: "rgba(255,255,255,0.08)", borderRadius: 4 }} />
    </div>
  ),
}

const DESIGN_W = 300
const DISPLAY_W = 144

function TemplateMockup({ blockTypes }: { blockTypes: string[] }) {
  const scale = DISPLAY_W / DESIGN_W

  if (!blockTypes.length) {
    return (
      <div style={{ width: DISPLAY_W, height: 110, borderRadius: 5, border: "1.5px dashed rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <div style={{ fontSize: 18, opacity: 0.2 }}>+</div>
        <span style={{ fontSize: 8.5, color: "#3A3850", letterSpacing: "0.1em" }}>EM BRANCO</span>
      </div>
    )
  }

  const totalH = blockTypes.reduce((s, t) => s + (MH[t] ?? 40), 0)
  const displayH = Math.round(totalH * scale)

  return (
    <div style={{ width: DISPLAY_W, height: displayH, overflow: "hidden", borderRadius: 5, border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
      <div style={{ width: DESIGN_W, transformOrigin: "top left", transform: `scale(${scale})` }}>
        {blockTypes.map((t, i) => {
          const Renderer = BR[t]
          return Renderer
            ? <Renderer key={i} />
            : <div key={i} style={{ height: 40, background: "rgba(255,255,255,0.03)", borderLeft: "2px solid rgba(255,255,255,0.08)" }} />
        })}
      </div>
    </div>
  )
}

// ── TemplatePicker modal ────────────────────────────────────────────────────

interface TemplatePickerProps {
  selected: CampaignTemplate
  onSelect: (t: CampaignTemplate) => void
  onClose: () => void
}

function TemplatePicker({ selected, onSelect, onClose }: TemplatePickerProps) {
  const ALL = [...CAMPAIGN_TEMPLATES, BLANK_TEMPLATE]

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return (
    <div
      onClick={handleBackdrop}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(5,5,10,0.88)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", overflowY: "auto" }}
    >
      <div style={{ width: "100%", maxWidth: 920, background: "#0F0F18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#F0EEF8", margin: 0 }}>Escolher template</h2>
            <p style={{ fontSize: 12, color: "#55526A", margin: "4px 0 0" }}>Preview visual da estrutura de blocos de cada template.</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 6, width: 32, height: 32, cursor: "pointer", color: "#8E8AA8", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>

        {/* Grid */}
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, alignItems: "start" }}>
          {ALL.map((tpl) => {
            const isSelected = selected.id === tpl.id
            const blockTypes = (tpl.blocks as Array<{ type: string }>).map((b) => b.type)
            const catColor = CATEGORY_COLORS[tpl.category] ?? "#55526A"

            return (
              <div
                key={tpl.id}
                onClick={() => { onSelect(tpl); onClose() }}
                style={{
                  borderRadius: 10,
                  border: `1.5px solid ${isSelected ? "rgba(166,124,255,0.6)" : "rgba(255,255,255,0.07)"}`,
                  background: isSelected ? "rgba(166,124,255,0.07)" : "rgba(255,255,255,0.02)",
                  padding: "14px 14px 16px",
                  cursor: "pointer",
                  position: "relative",
                  transition: "border-color 120ms, background 120ms",
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)" }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)" }}
              >
                {isSelected && (
                  <div style={{ position: "absolute", top: 10, right: 10, width: 18, height: 18, borderRadius: "50%", background: "#A67CFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", zIndex: 1 }}>✓</div>
                )}

                {/* Visual mockup */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  <TemplateMockup blockTypes={blockTypes} />
                </div>

                {/* Info */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#C4AEFF" : "#F0EEF8" }}>{tpl.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 6px", borderRadius: 4, background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}30` }}>
                    {tpl.categoryLabel.toUpperCase()}
                  </span>
                  {blockTypes.length > 0 && <span style={{ fontSize: 10, color: "#3A3850" }}>{blockTypes.length} blocos</span>}
                </div>
                <p style={{ fontSize: 11, color: "#6B6780", margin: 0, lineHeight: 1.5 }}>{tpl.description}</p>
              </div>
            )
          })}
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#3A3850" }}>
          Todos os blocos podem ser adicionados, reordenados ou removidos depois no editor.
        </div>
      </div>
    </div>
  )
}

// ── CampaignWizard ──────────────────────────────────────────────────────────

export function CampaignWizard({ brands }: Props) {
  const [step,       setStep]       = useState<Step>(1)
  const [brandId,    setBrandId]    = useState(brands[0]?.id ?? "")
  const [slug,       setSlug]       = useState("")
  const [lang,       setLang]       = useState("pt-BR")
  const [title,      setTitle]      = useState("")
  const [desc,       setDesc]       = useState("")
  const [template,   setTemplate]   = useState<CampaignTemplate>(BLANK_TEMPLATE)
  const [showPicker, setShowPicker] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState("")

  const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)

  useEffect(() => {
    if (!showPicker) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowPicker(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [showPicker])

  useEffect(() => {
    if (showPicker) {
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = "" }
    }
  }, [showPicker])

  async function create() {
    if (!slugOk || !brandId) return
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, slug, lang, meta: { title: title.trim(), description: desc.trim() }, blocks: template.blocks }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { id } = await res.json() as { id: string }
      window.location.href = `/admin/campaigns/${id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar campanha")
      setSaving(false)
    }
  }

  const selectedBrand = brands.find((b) => b.id === brandId)
  const blockTypes    = (template.blocks as Array<{ type: string }>).map((b) => b.type)
  const catColor      = CATEGORY_COLORS[template.category] ?? "#55526A"

  return (
    <>
      {showPicker && <TemplatePicker selected={template} onSelect={setTemplate} onClose={() => setShowPicker(false)} />}

      <div style={{ minHeight: "100dvh", background: "#0D0D12", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 16px" }}>
        <div style={{ width: "100%", maxWidth: 560 }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <Link href="/admin/campaigns" style={{ fontSize: 12, color: "#55526A", textDecoration: "none" }}>← Campanhas</Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F0EEF8", margin: "10px 0 4px" }}>Nova campanha</h1>
            <p style={{ fontSize: 13, color: "#8E8AA8", margin: 0 }}>Configure os detalhes básicos. Você poderá editar tudo no editor.</p>
          </div>

          {/* Stepper */}
          <div style={{ display: "flex", gap: 0, marginBottom: 32 }}>
            {([1, 2, 3] as Step[]).map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, background: step === s ? "#A67CFF" : step > s ? "#2EB87A" : "rgba(255,255,255,0.08)", color: step >= s ? "#fff" : "#55526A" }}>
                  {step > s ? "✓" : s}
                </div>
                <span style={{ fontSize: 11, color: step === s ? "#C4AEFF" : "#55526A", marginLeft: 8, fontWeight: step === s ? 600 : 400 }}>
                  {s === 1 ? "Marca & slug" : s === 2 ? "SEO" : "Template"}
                </span>
                {i < 2 && <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)", margin: "0 12px" }} />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div style={{ background: "#13121A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 28 }}>

            {/* ── Step 1 ── */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Marca</label>
                  {brands.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#E05260" }}>Nenhuma marca cadastrada.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {brands.map((b) => (
                        <div key={b.id} onClick={() => setBrandId(b.id)}
                          style={{ padding: "12px 14px", borderRadius: 8, cursor: "pointer", border: `1px solid ${brandId === b.id ? "rgba(166,124,255,0.55)" : "rgba(255,255,255,0.07)"}`, background: brandId === b.id ? "rgba(166,124,255,0.08)" : "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 10 }}
                          onMouseEnter={(e) => { if (brandId !== b.id) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)" }}
                          onMouseLeave={(e) => { if (brandId !== b.id) e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)" }}
                        >
                          <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: brandId === b.id ? "#A67CFF" : "rgba(255,255,255,0.15)" }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: brandId === b.id ? "#C4AEFF" : "#F0EEF8" }}>{b.name}</div>
                            {b.domain && <div style={{ fontSize: 10, color: "#55526A", marginTop: 2 }}>{b.domain}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Slug</label>
                  <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-"))}
                    style={{ ...fld, fontFamily: "monospace", borderColor: slug && !slugOk ? "#E05260" : undefined }}
                    placeholder="ex: namorados2026"
                    onKeyDown={(e) => { if (e.key === "Enter" && slugOk && brandId) setStep(2) }}
                  />
                  {slug && !slugOk && <div style={{ fontSize: 10, color: "#E05260", marginTop: 4 }}>Use apenas letras minúsculas, números e hífens.</div>}
                  {slugOk && selectedBrand && <div style={{ fontSize: 10, color: "#55526A", marginTop: 4, fontFamily: "monospace" }}>URL: /{selectedBrand.id}/{slug}</div>}
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Idioma</label>
                  <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ ...fld, cursor: "pointer" }}>
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ fontSize: 12, color: "#8E8AA8" }}>Esses dados aparecem nos resultados de busca e no &lt;title&gt; da página.</div>
                <div>
                  <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Título da página</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} style={fld} placeholder="Ex: Dia dos Namorados 2026 · Lush Motel" autoFocus />
                  <div style={{ fontSize: 10, color: title.length > 60 ? "#E05260" : "#3A3850", marginTop: 3, textAlign: "right" }}>{title.length}/60</div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Descrição</label>
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...fld, resize: "vertical" }} rows={3} placeholder="Descrição para mecanismos de busca" />
                  <div style={{ fontSize: 10, color: desc.length > 160 ? "#E05260" : "#3A3850", marginTop: 3, textAlign: "right" }}>{desc.length}/160</div>
                </div>
                <div style={{ fontSize: 11, color: "#55526A" }}>Pode pular — edite depois em SEO no editor.</div>
              </div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 12, color: "#8E8AA8" }}>Escolha um ponto de partida para os blocos da campanha.</div>

                {/* Selected template summary */}
                <div style={{ borderRadius: 10, border: "1.5px solid rgba(166,124,255,0.4)", background: "rgba(166,124,255,0.05)", padding: "16px 16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ width: 72, flexShrink: 0 }}>
                      <BlockWireframe blockTypes={blockTypes} height={90} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#C4AEFF" }}>{template.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 6px", borderRadius: 4, background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}30` }}>
                          {template.categoryLabel.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "#6B6780", margin: "0 0 10px", lineHeight: 1.5 }}>{template.description}</p>
                      {blockTypes.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {blockTypes.map((t, i) => (
                            <span key={i} style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: "rgba(255,255,255,0.06)", color: "#8E8AA8", fontFamily: "monospace" }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowPicker(true)}
                  style={{ background: "transparent", border: "1px solid rgba(166,124,255,0.3)", borderRadius: 8, padding: "10px 16px", color: "#A67CFF", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(166,124,255,0.08)"; e.currentTarget.style.borderColor = "rgba(166,124,255,0.5)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(166,124,255,0.3)" }}
                >
                  Escolher template →
                </button>

                {error && <div style={{ fontSize: 11, color: "#E05260", padding: "8px 12px", background: "rgba(224,82,96,0.08)", borderRadius: 6 }}>{error}</div>}
              </div>
            )}

            {/* Nav buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "flex-end" }}>
              {step > 1 && (
                <button onClick={() => setStep((s) => (s - 1) as Step)}
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "9px 20px", color: "#8E8AA8", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                  Voltar
                </button>
              )}
              {step < 3 ? (
                <button onClick={() => setStep((s) => (s + 1) as Step)} disabled={step === 1 && (!slugOk || !brandId)}
                  style={{ background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6, padding: "9px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: step === 1 && (!slugOk || !brandId) ? 0.5 : 1 }}>
                  Próximo
                </button>
              ) : (
                <button onClick={create} disabled={saving}
                  style={{ background: saving ? "#6B52A8" : "#A67CFF", color: "#fff", border: "none", borderRadius: 6, padding: "9px 24px", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>
                  {saving ? "Criando…" : "Criar e abrir editor →"}
                </button>
              )}
            </div>
          </div>

          {/* Summary bar */}
          {step > 1 && (
            <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "#55526A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Resumo</div>
              <div style={{ fontSize: 12, color: "#8E8AA8", display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span style={{ color: "#C4AEFF" }}>{selectedBrand?.name}</span>
                <span style={{ fontFamily: "monospace", color: "#F0EEF8" }}>{slug}</span>
                {title && <span>{title}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
