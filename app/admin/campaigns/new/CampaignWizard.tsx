"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BLANK_TEMPLATE, CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/lib/campaign-templates";

interface Brand {
  id: string
  name: string
  domain?: string
}

interface Props {
  brands: Brand[]
}

type Step = 1 | 2 | 3

// ── Styles ─────────────────────────────────────────────────────────────────

const fld: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "8px 12px", color: "#F0EEF8", fontSize: 13,
  outline: "none", fontFamily: "inherit",
}

// ── Block visual metadata ──────────────────────────────────────────────────

interface BlockVisual { color: string; border: string; weight: number; label: string }

const BLOCK_VISUAL: Record<string, BlockVisual> = {
  nav:        { color: "rgba(166,124,255,0.14)", border: "rgba(166,124,255,0.45)", weight: 3,  label: "NAV" },
  hero:       { color: "rgba(79,180,138,0.13)",  border: "rgba(79,180,138,0.4)",   weight: 22, label: "HERO" },
  feature:    { color: "rgba(79,180,138,0.08)",  border: "rgba(79,180,138,0.28)",  weight: 12, label: "FEATURE" },
  benefits:   { color: "rgba(79,180,138,0.06)",  border: "rgba(79,180,138,0.22)",  weight: 10, label: "BENEFITS" },
  menuGrid:   { color: "rgba(120,100,220,0.12)", border: "rgba(120,100,220,0.38)", weight: 11, label: "MENU" },
  priceCards: { color: "rgba(240,168,74,0.1)",   border: "rgba(240,168,74,0.35)",  weight: 12, label: "PREÇOS" },
  unitPicker: { color: "rgba(46,135,220,0.12)",  border: "rgba(46,135,220,0.38)",  weight: 18, label: "RESERVA" },
  offer:      { color: "rgba(240,168,74,0.07)",  border: "rgba(240,168,74,0.25)",  weight: 10, label: "OFERTA" },
  faq:        { color: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.15)", weight: 9,  label: "FAQ" },
  footer:     { color: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.1)",  weight: 6,  label: "FOOTER" },
  stickyCta:  { color: "rgba(166,124,255,0.22)", border: "rgba(166,124,255,0.6)",  weight: 3,  label: "CTA" },
}

const FALLBACK_VISUAL: BlockVisual = {
  color: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.12)", weight: 6, label: "BLOCO",
}

// ── Category badge ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  conversao:     "#2EB87A",
  gastronomia:   "#F0A84A",
  informacional: "#5B9BD5",
  oferta:        "#E05260",
  storytelling:  "#A67CFF",
  blank:         "#55526A",
}

// ── BlockWireframe ─────────────────────────────────────────────────────────

function BlockWireframe({ blockTypes, height = 120 }: { blockTypes: string[]; height?: number }) {
  if (blockTypes.length === 0) {
    return (
      <div style={{ height, borderRadius: 6, border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 10, color: "#3A3850", letterSpacing: "0.08em" }}>SEM BLOCOS</span>
      </div>
    )
  }

  const totalWeight = blockTypes.reduce((sum, t) => sum + (BLOCK_VISUAL[t]?.weight ?? FALLBACK_VISUAL.weight), 0)

  return (
    <div style={{ height, display: "flex", flexDirection: "column", gap: 1.5, borderRadius: 6, overflow: "hidden" }}>
      {blockTypes.map((t, i) => {
        const v = BLOCK_VISUAL[t] ?? FALLBACK_VISUAL
        const pct = (v.weight / totalWeight) * 100
        return (
          <div
            key={i}
            style={{
              flex: `0 0 calc(${pct}% - 1.5px)`,
              minHeight: 4,
              background: v.color,
              borderLeft: `2px solid ${v.border}`,
              borderRadius: "0 2px 2px 0",
              display: "flex",
              alignItems: "center",
              paddingLeft: 6,
              overflow: "hidden",
            }}
          >
            {pct > 6 && (
              <span style={{ fontSize: 6.5, color: v.border, fontWeight: 800, letterSpacing: "0.1em", whiteSpace: "nowrap", opacity: 0.9 }}>
                {v.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── TemplatePicker modal ───────────────────────────────────────────────────

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
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(5,5,10,0.88)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 860,
          background: "#0F0F18",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#F0EEF8", margin: 0 }}>Escolher template</h2>
            <p style={{ fontSize: 12, color: "#55526A", margin: "4px 0 0" }}>Ponto de partida para a estrutura de blocos da campanha.</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 6, width: 32, height: 32, cursor: "pointer", color: "#8E8AA8", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>

        {/* Grid */}
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
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
                  transition: "border-color 120ms, background 120ms",
                  position: "relative",
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)" }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)" }}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <div style={{ position: "absolute", top: 10, right: 10, width: 18, height: 18, borderRadius: "50%", background: "#A67CFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>
                    ✓
                  </div>
                )}

                {/* Wireframe preview */}
                <div style={{ marginBottom: 12 }}>
                  <BlockWireframe blockTypes={blockTypes} height={130} />
                </div>

                {/* Info */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#C4AEFF" : "#F0EEF8" }}>{tpl.name}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                    padding: "2px 6px", borderRadius: 4,
                    background: `${catColor}18`,
                    color: catColor,
                    border: `1px solid ${catColor}30`,
                  }}>
                    {tpl.categoryLabel.toUpperCase()}
                  </span>
                  {blockTypes.length > 0 && (
                    <span style={{ fontSize: 10, color: "#3A3850" }}>{blockTypes.length} blocos</span>
                  )}
                </div>

                <p style={{ fontSize: 11, color: "#6B6780", margin: 0, lineHeight: 1.5 }}>{tpl.description}</p>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#3A3850" }}>
          Todos os blocos podem ser adicionados, reordenados ou removidos depois no editor.
        </div>
      </div>
    </div>
  )
}

// ── CampaignWizard ─────────────────────────────────────────────────────────

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
        body: JSON.stringify({
          brandId, slug, lang,
          meta: { title: title.trim(), description: desc.trim() },
          blocks: template.blocks,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { id } = await res.json() as { id: string }
      window.location.href = `/admin/campaigns/${id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar campanha")
      setSaving(false)
    }
  }

  const selectedBrand  = brands.find((b) => b.id === brandId)
  const blockTypes     = (template.blocks as Array<{ type: string }>).map((b) => b.type)
  const catColor       = CATEGORY_COLORS[template.category] ?? "#55526A"

  return (
    <>
      {showPicker && (
        <TemplatePicker
          selected={template}
          onSelect={setTemplate}
          onClose={() => setShowPicker(false)}
        />
      )}

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
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                  background: step === s ? "#A67CFF" : step > s ? "#2EB87A" : "rgba(255,255,255,0.08)",
                  color: step >= s ? "#fff" : "#55526A",
                }}>{step > s ? "✓" : s}</div>
                <span style={{ fontSize: 11, color: step === s ? "#C4AEFF" : "#55526A", marginLeft: 8, fontWeight: step === s ? 600 : 400 }}>
                  {s === 1 ? "Marca & slug" : s === 2 ? "SEO" : "Template"}
                </span>
                {i < 2 && <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)", margin: "0 12px" }} />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div style={{ background: "#13121A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 28 }}>

            {/* ── Passo 1 ── */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Marca</label>
                  {brands.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#E05260" }}>Nenhuma marca cadastrada.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {brands.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => setBrandId(b.id)}
                          style={{
                            padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                            border: `1px solid ${brandId === b.id ? "rgba(166,124,255,0.55)" : "rgba(255,255,255,0.07)"}`,
                            background: brandId === b.id ? "rgba(166,124,255,0.08)" : "rgba(255,255,255,0.02)",
                            display: "flex", alignItems: "center", gap: 10,
                          }}
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
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-"))}
                    style={{ ...fld, fontFamily: "monospace", borderColor: slug && !slugOk ? "#E05260" : undefined }}
                    placeholder="ex: namorados2026"
                    onKeyDown={(e) => { if (e.key === "Enter" && slugOk && brandId) setStep(2) }}
                  />
                  {slug && !slugOk && (
                    <div style={{ fontSize: 10, color: "#E05260", marginTop: 4 }}>Use apenas letras minúsculas, números e hífens.</div>
                  )}
                  {slugOk && selectedBrand && (
                    <div style={{ fontSize: 10, color: "#55526A", marginTop: 4, fontFamily: "monospace" }}>
                      URL: /{selectedBrand.id}/{slug}
                    </div>
                  )}
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

            {/* ── Passo 2 ── */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ fontSize: 12, color: "#8E8AA8" }}>Esses dados aparecem nos resultados de busca e no &lt;title&gt; da página.</div>
                <div>
                  <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Título da página</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={fld}
                    placeholder="Ex: Dia dos Namorados 2026 · Lush Motel"
                    autoFocus
                  />
                  <div style={{ fontSize: 10, color: title.length > 60 ? "#E05260" : "#3A3850", marginTop: 3, textAlign: "right" }}>
                    {title.length}/60
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>Descrição</label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    style={{ ...fld, resize: "vertical" }}
                    rows={3}
                    placeholder="Descrição para mecanismos de busca"
                  />
                  <div style={{ fontSize: 10, color: desc.length > 160 ? "#E05260" : "#3A3850", marginTop: 3, textAlign: "right" }}>
                    {desc.length}/160
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#55526A" }}>Pode pular — edite depois em SEO no editor.</div>
              </div>
            )}

            {/* ── Passo 3 ── */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 12, color: "#8E8AA8" }}>Escolha um ponto de partida para os blocos da campanha.</div>

                {/* Selected template preview */}
                <div style={{
                  borderRadius: 10,
                  border: "1.5px solid rgba(166,124,255,0.4)",
                  background: "rgba(166,124,255,0.05)",
                  padding: "16px 16px 18px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>

                    {/* Wireframe preview */}
                    <div style={{ width: 72, flexShrink: 0 }}>
                      <BlockWireframe blockTypes={blockTypes} height={90} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#C4AEFF" }}>{template.name}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                          padding: "2px 6px", borderRadius: 4,
                          background: `${catColor}18`, color: catColor,
                          border: `1px solid ${catColor}30`,
                        }}>
                          {template.categoryLabel.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "#6B6780", margin: "0 0 10px", lineHeight: 1.5 }}>{template.description}</p>
                      {blockTypes.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {blockTypes.map((t, i) => (
                            <span key={i} style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: "rgba(255,255,255,0.06)", color: "#8E8AA8", fontFamily: "monospace" }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowPicker(true)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(166,124,255,0.3)",
                    borderRadius: 8, padding: "10px 16px",
                    color: "#A67CFF", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    textAlign: "center",
                    transition: "background 120ms, border-color 120ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(166,124,255,0.08)"; e.currentTarget.style.borderColor = "rgba(166,124,255,0.5)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(166,124,255,0.3)" }}
                >
                  Escolher template →
                </button>

                {error && (
                  <div style={{ fontSize: 11, color: "#E05260", padding: "8px 12px", background: "rgba(224,82,96,0.08)", borderRadius: 6 }}>
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "flex-end" }}>
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "9px 20px", color: "#8E8AA8", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
                >
                  Voltar
                </button>
              )}

              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  disabled={step === 1 && (!slugOk || !brandId)}
                  style={{
                    background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6,
                    padding: "9px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    opacity: step === 1 && (!slugOk || !brandId) ? 0.5 : 1,
                  }}
                >
                  Próximo
                </button>
              ) : (
                <button
                  onClick={create}
                  disabled={saving}
                  style={{
                    background: saving ? "#6B52A8" : "#A67CFF", color: "#fff", border: "none", borderRadius: 6,
                    padding: "9px 24px", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer",
                  }}
                >
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
