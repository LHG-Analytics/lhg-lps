"use client";
import { useState } from "react";

interface Brand {
  id: string;
  name: string;
  domain?: string;
}

interface Props {
  brands: Brand[];
}

type Step = 1 | 2 | 3;

const fld: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "8px 12px", color: "#F0EEF8", fontSize: 13,
  outline: "none", fontFamily: "inherit",
};

const BLOCK_TEMPLATES: Record<string, { label: string; description: string; blocks: unknown[] }> = {
  blank: {
    label: "Em branco",
    description: "Começa sem nenhum bloco. Adicione pelo editor.",
    blocks: [],
  },
  namorados: {
    label: "Template Namorados",
    description: "Nav + Hero + Benefits + UnitPicker + Offer + FAQ + Footer + StickyCta",
    blocks: [
      { type: "nav",        props: { tag: "Edição especial" } },
      { type: "hero",       props: { video: "", eyebrow: "Campanha", headlineFull: "Título da campanha", headlineEmphasis: "campanha", typewriter: false, subtitle: "Subtítulo da campanha.", primaryCta: { label: "Reservar", href: "#unit-picker" }, meta: [] } },
      { type: "benefits",   props: { eyebrow: "Benefícios", headlineFull: "Por que escolher", headlineEmphasis: "escolher", items: [] } },
      { type: "unitPicker", props: { id: "unit-picker", eyebrow: "Escolha sua unidade", headline: "Reserve agora", subtitle: "", units: [], wizardSteps: [{ n: 1, label: "Período" }, { n: 2, label: "Data" }, { n: 3, label: "Suíte" }, { n: 4, label: "Resumo" }], stepCopy: { period: { title: "Escolha o período", hint: "" }, date: { title: "Escolha a data", hint: "", smallHint: "", couponHint: "" }, category: { title: "Escolha a suíte", hint: "" }, summary: { title: "Resumo", hint: "", labels: { unit: "Unidade", period: "Período", date: "Data", category: "Suíte", inclusos: "Inclusos", lot: "Lote", price: "Valor" }, couponLine: "", lotLineNoCoupon: "" } }, openCtaLabel: "Reservar", confirmCtaLabel: "Confirmar" } },
      { type: "offer",      props: { eyebrow: "Oferta especial", headlineFull: "Título da oferta", headlineHtml: "Título da <em>oferta</em>", subtitle: "", ctas: [{ label: "Reservar agora", href: "#unit-picker", variant: "gold" }], note: "" } },
      { type: "faq",        props: { eyebrow: "FAQ", headlineFull: "Perguntas frequentes", headlineEmphasis: "frequentes", intro: "", items: [{ q: "Pergunta?", a: "Resposta." }] } },
      { type: "footer",     props: { tagline: "Tagline da marca.", columns: [], copyright: `© ${new Date().getFullYear()} Lush Hotel Group. Todos os direitos reservados.`, ageNotice: "Proibido para menores de 18 anos." } },
      { type: "stickyCta",  props: { ctas: [{ label: "Reservar", href: "#unit-picker", variant: "gold" }] } },
    ],
  },
};

export function CampaignWizard({ brands }: Props) {
  const [step,     setStep]     = useState<Step>(1);
  const [brandId,  setBrandId]  = useState(brands[0]?.id ?? "");
  const [slug,     setSlug]     = useState("");
  const [lang,     setLang]     = useState("pt-BR");
  const [title,    setTitle]    = useState("");
  const [desc,     setDesc]     = useState("");
  const [template, setTemplate] = useState<keyof typeof BLOCK_TEMPLATES>("blank");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

  async function create() {
    if (!slugOk || !brandId) return;
    setSaving(true); setError("");
    try {
      const tpl = BLOCK_TEMPLATES[template] ?? BLOCK_TEMPLATES.blank!;
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          slug,
          lang,
          meta: { title: title.trim(), description: desc.trim() },
          blocks: tpl.blocks,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json() as { id: string };
      window.location.href = `/admin/campaigns/${id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar campanha");
      setSaving(false);
    }
  }

  const selectedBrand = brands.find((b) => b.id === brandId);

  return (
    <div style={{ minHeight: "100dvh", background: "#0D0D12", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 16px" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <a href="/admin/campaigns" style={{ fontSize: 12, color: "#55526A", textDecoration: "none" }}>← Campanhas</a>
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
                        onMouseEnter={(e) => { if (brandId !== b.id) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                        onMouseLeave={(e) => { if (brandId !== b.id) e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
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
                  onKeyDown={(e) => { if (e.key === "Enter" && slugOk && brandId) setStep(2); }}
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
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 12, color: "#8E8AA8" }}>Escolha um ponto de partida para os blocos da campanha.</div>
              {Object.entries(BLOCK_TEMPLATES).map(([key, tpl]) => (
                <div
                  key={key}
                  onClick={() => setTemplate(key as keyof typeof BLOCK_TEMPLATES)}
                  style={{
                    padding: "14px 16px", borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${template === key ? "rgba(166,124,255,0.55)" : "rgba(255,255,255,0.07)"}`,
                    background: template === key ? "rgba(166,124,255,0.08)" : "rgba(255,255,255,0.02)",
                  }}
                  onMouseEnter={(e) => { if (template !== key) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                  onMouseLeave={(e) => { if (template !== key) e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: template === key ? "#A67CFF" : "rgba(255,255,255,0.15)" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: template === key ? "#C4AEFF" : "#F0EEF8" }}>{tpl.label}</span>
                    {tpl.blocks.length > 0 && (
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "#55526A" }}>{tpl.blocks.length} blocos</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#55526A", marginTop: 4, paddingLeft: 16 }}>{tpl.description}</div>
                </div>
              ))}

              {error && <div style={{ fontSize: 11, color: "#E05260", padding: "8px 12px", background: "rgba(224,82,96,0.08)", borderRadius: 6 }}>{error}</div>}
            </div>
          )}

          {/* Botões de navegação */}
          <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "flex-end" }}>
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as Step)}
                style={{
                  background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                  padding: "9px 20px", color: "#8E8AA8", fontSize: 13, cursor: "pointer", fontWeight: 600,
                }}
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

        {/* Resumo */}
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
  );
}
