"use client";
import { useMemo, useState } from "react";

/* ── tipos ──────────────────────────────────────────── */

export type GeoMeta = {
  summary?: string;
  keyFacts?: string[];
  contentType?: "Offer" | "Event" | "Product" | "Service";
  priceLow?: number;
  priceHigh?: number;
  priceCurrency?: string;
  validFrom?: string;
  validThrough?: string;
  qa?: Array<{ q: string; a: string }>;
  audience?: string;
  aiCrawlers?: "allow" | "block";
};

type LooseBlock = { type: string; props?: Record<string, unknown> };

interface Props {
  geo: GeoMeta;
  /** Título/descrição de SEO — usados como fallback na prévia e na derivação. */
  seoTitle?: string;
  seoDescription?: string;
  brandName: string;
  /** Blocos atuais do editor — fonte da derivação automática. */
  blocks: LooseBlock[];
  onChange: (geo: GeoMeta) => void;
  onSave: () => void;
  saving: boolean;
}

/* ── estilos ────────────────────────────────────────── */

const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "7px 10px", color: "#F0EEF8", fontSize: 13, outline: "none",
  fontFamily: "inherit", resize: "vertical" as const,
};

function Divider() {
  return <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 2 }} />;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#55526A", marginBottom: 10 }}>
      {children}
    </div>
  );
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
      {children}
    </label>
  );
}
function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: "#3A3850", marginTop: 3, lineHeight: 1.45 }}>{children}</div>;
}
function CharCount({ value, max }: { value?: string; max: number }) {
  const len = value?.length ?? 0;
  const color = len > max ? "#E05260" : len >= max * 0.85 ? "#F0A84A" : "#3A3850";
  return <div style={{ fontSize: 10, color, marginTop: 3, textAlign: "right" as const }}>{len}/{max}</div>;
}

function Collapsible({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 11px",
          background: open ? "rgba(255,255,255,0.03)" : "transparent", border: "none",
          cursor: "pointer", color: "#8E8AA8", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
          textAlign: "left" as const,
        }}
      >
        <span style={{ color: "#55526A", fontSize: 9, transform: open ? "rotate(90deg)" : "none", transition: "transform 140ms", display: "inline-block" }}>▶</span>
        <span style={{ flex: 1 }}>{title}</span>
        {badge && (
          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(166,124,255,0.14)", color: "#A67CFF", fontWeight: 700 }}>
            {badge}
          </span>
        )}
      </button>
      {open && <div style={{ padding: "4px 11px 12px" }}>{children}</div>}
    </div>
  );
}

/* ── derivação automática a partir dos blocos ───────── */

/** "R$ 1.234,56" → 1234.56 */
function parseBRL(raw: string): number | null {
  const m = raw.match(/[\d.,]+/);
  if (!m) return null;
  let t = m[0];
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g)?.length ?? 0) === 1 && (t.split(".")[1]?.length ?? 0) === 3) t = t.replace(".", "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function firstBlock(blocks: LooseBlock[], type: string) {
  return blocks.find((b) => b.type === type)?.props;
}

/** Monta um rascunho de GEO a partir do que já existe nos blocos.
 * Nunca sobrescreve campo já preenchido — só completa lacunas. */
function deriveFromBlocks(
  blocks: LooseBlock[],
  current: GeoMeta,
  seoTitle: string | undefined,
  seoDescription: string | undefined,
  brandName: string,
): GeoMeta {
  const next: GeoMeta = { ...current };

  const priceProps = firstBlock(blocks, "priceCards") as
    | { cards?: Array<{ name?: string; price?: string; note?: string }>; availability?: string }
    | undefined;
  const menuProps = firstBlock(blocks, "menuGrid") as
    | { items?: Array<{ name?: string; tag?: string }> }
    | undefined;
  const heroProps = firstBlock(blocks, "hero") as
    | { meta?: Array<{ label?: string; value?: string }>; subtitle?: string }
    | undefined;
  const faqProps = firstBlock(blocks, "faq") as
    | { items?: Array<{ q: string; a: string }> }
    | undefined;

  // Preço — menor e maior valor entre os cards
  const prices = (priceProps?.cards ?? [])
    .map((c) => (c.price ? parseBRL(c.price) : null))
    .filter((n): n is number => n !== null);
  if (prices.length > 0) {
    if (next.priceLow  === undefined) next.priceLow  = Math.min(...prices);
    if (next.priceHigh === undefined) next.priceHigh = Math.max(...prices);
    if (!next.priceCurrency) next.priceCurrency = "BRL";
  }

  // Pontos-chave — itens do menu, faixa de preço, metadados do hero
  if (!next.keyFacts?.length) {
    const facts: string[] = [];
    for (const item of menuProps?.items ?? []) {
      if (item.name) facts.push(item.tag ? `${item.name} (${item.tag})` : item.name);
    }
    for (const card of priceProps?.cards ?? []) {
      if (card.name && card.price) facts.push(`${card.name}: ${card.price}${card.note ? ` — ${card.note}` : ""}`);
    }
    for (const m of heroProps?.meta ?? []) {
      if (m.label && m.value) facts.push(`${m.label}: ${m.value}`);
    }
    if (priceProps?.availability) facts.push(priceProps.availability);
    if (facts.length > 0) next.keyFacts = facts.slice(0, 8);
  }

  // Resumo — prosa factual montada a partir de título, subtítulo e preço
  if (!next.summary?.trim()) {
    const parts: string[] = [];
    const base = seoTitle?.trim() || brandName;
    parts.push(heroProps?.subtitle?.trim() ? `${base}. ${heroProps.subtitle.trim()}` : `${base}.`);
    if (seoDescription?.trim()) parts.push(seoDescription.trim());
    if (prices.length > 0) {
      const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
      parts.push(
        Math.min(...prices) === Math.max(...prices)
          ? `Valor: ${fmt(prices[0]!)}.`
          : `Valores de ${fmt(Math.min(...prices))} a ${fmt(Math.max(...prices))}.`
      );
    }
    next.summary = parts.join(" ").slice(0, 300);
  }

  // Q&A — herda do bloco FAQ
  if (!next.qa?.length && faqProps?.items?.length) {
    next.qa = faqProps.items.slice(0, 6).map((i) => ({ q: i.q, a: i.a }));
  }

  if (!next.contentType)   next.contentType   = "Offer";
  if (!next.aiCrawlers)    next.aiCrawlers    = "allow";
  if (!next.priceCurrency) next.priceCurrency = "BRL";

  return next;
}

/* ── score de completude ────────────────────────────── */

interface Check { ok: boolean; label: string; hint: string }

function buildChecks(geo: GeoMeta, blocks: LooseBlock[]): Check[] {
  const faqItems = (firstBlock(blocks, "faq") as { items?: unknown[] } | undefined)?.items?.length ?? 0;
  return [
    { ok: (geo.summary?.trim().length ?? 0) >= 80,
      label: "Resumo factual",
      hint: "Escreva 2–3 frases declarativas — é o trecho que o LLM cita." },
    { ok: (geo.keyFacts?.filter((f) => f.trim()).length ?? 0) >= 3,
      label: "Pontos-chave (≥ 3)",
      hint: "Liste ao menos 3 fatos atômicos: preço, período, unidades." },
    { ok: geo.priceLow !== undefined || geo.priceHigh !== undefined,
      label: "Faixa de preço",
      hint: "Preço é o dado que LLMs mais citam em respostas de compra." },
    { ok: Boolean(geo.validThrough),
      label: "Validade",
      hint: "Sem data-limite o modelo pode citar a oferta depois de encerrada." },
    { ok: Boolean(geo.contentType),
      label: "Tipo de conteúdo",
      hint: "Define a entidade schema.org principal (Offer, Event…)." },
    { ok: (geo.qa?.length ?? 0) > 0 || faqItems > 0,
      label: "Perguntas & respostas",
      hint: "Pares Q&A viram FAQPage — alta taxa de citação em IA." },
    { ok: Boolean(geo.audience?.trim()),
      label: "Público-alvo",
      hint: "Ajuda o modelo a recomendar a página para a pessoa certa." },
  ];
}

/* ── prévia de citação por IA ───────────────────────── */

function AiPreview({ geo, seoTitle, brandName }: { geo: GeoMeta; seoTitle?: string; brandName: string }) {
  const facts = (geo.keyFacts ?? []).filter((f) => f.trim()).slice(0, 4);
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: geo.priceCurrency || "BRL", minimumFractionDigits: 0 });

  const priceLine =
    geo.priceLow !== undefined && geo.priceHigh !== undefined && geo.priceLow !== geo.priceHigh
      ? `${fmt(geo.priceLow)} – ${fmt(geo.priceHigh)}`
      : geo.priceLow !== undefined ? fmt(geo.priceLow)
      : geo.priceHigh !== undefined ? fmt(geo.priceHigh)
      : null;

  const validity = geo.validThrough
    ? new Date(`${geo.validThrough}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const hasContent = Boolean(geo.summary?.trim()) || facts.length > 0 || priceLine;

  return (
    <div style={{ background: "#15151E", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 13px" }}>
      {/* cabeçalho estilo chat */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, background: "linear-gradient(135deg,#A67CFF,#6B52A8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10 }}>✦</div>
        <span style={{ fontSize: 10, color: "#55526A" }}>Resposta gerada por IA</span>
      </div>

      {!hasContent ? (
        <div style={{ fontSize: 11, color: "#3A3850", lineHeight: 1.6, fontStyle: "italic" as const }}>
          Sem dados suficientes. O modelo teria de adivinhar a partir do texto solto da página — e é aí que ele erra preço, data ou unidade.
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: "#C4BFDE", lineHeight: 1.65 }}>
          {geo.summary?.trim() && <p style={{ margin: "0 0 8px" }}>{geo.summary.trim()}</p>}

          {facts.length > 0 && (
            <ul style={{ margin: "0 0 8px", paddingLeft: 15, display: "flex", flexDirection: "column", gap: 3 }}>
              {facts.map((f, i) => <li key={i} style={{ color: "#A8A0BE" }}>{f}</li>)}
            </ul>
          )}

          {(priceLine || validity) && (
            <p style={{ margin: "0 0 8px", color: "#A8A0BE" }}>
              {priceLine && <><strong style={{ color: "#F0EEF8" }}>{priceLine}</strong></>}
              {priceLine && validity && " · "}
              {validity && <>válido até {validity}</>}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 9, color: "#55526A" }}>Fonte</span>
            <span style={{ fontSize: 10, color: "#5B9BD5" }}>{seoTitle?.trim() || brandName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── GeoPanel ───────────────────────────────────────── */

export function GeoPanel({ geo, seoTitle, seoDescription, brandName, blocks, onChange, onSave, saving }: Props) {
  const up = (patch: Partial<GeoMeta>) => onChange({ ...geo, ...patch });

  const checks = useMemo(() => buildChecks(geo, blocks), [geo, blocks]);
  const done   = checks.filter((c) => c.ok).length;
  const pct    = Math.round((done / checks.length) * 100);
  const scoreColor = pct >= 85 ? "#2EB87A" : pct >= 55 ? "#F0A84A" : "#E05260";

  const facts = geo.keyFacts ?? [];
  const setFacts = (next: string[]) => up({ keyFacts: next.length ? next : undefined });

  const qa = geo.qa ?? [];
  const setQa = (next: GeoMeta["qa"]) => up({ qa: next?.length ? next : undefined });

  const crawlers = geo.aiCrawlers ?? "allow";

  return (
    <div className="admin-scroll admin-panel" style={{ flex: 1, overflowY: "auto" as const, padding: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

        {/* ── INTRO + DERIVAR ── */}
        <div style={{ background: "rgba(166,124,255,0.05)", border: "1px solid rgba(166,124,255,0.16)", borderRadius: 8, padding: "11px 12px" }}>
          <div style={{ fontSize: 11, color: "#A8A0BE", lineHeight: 1.55, marginBottom: 10 }}>
            O <strong style={{ color: "#C4AEFF" }}>GEO</strong> alimenta o JSON-LD da página — é o que ChatGPT, Perplexity
            e o AI Overviews leem para <em>citar</em> a campanha com preço e data corretos.
          </div>
          <button
            type="button"
            onClick={() => onChange(deriveFromBlocks(blocks, geo, seoTitle, seoDescription, brandName))}
            style={{
              width: "100%", background: "transparent", border: "1px solid rgba(166,124,255,0.35)",
              borderRadius: 6, padding: "7px 0", color: "#A67CFF", fontSize: 11, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            ✨ Preencher a partir do conteúdo da LP
          </button>
          <Hint>Completa só os campos vazios — nada do que você já escreveu é sobrescrito.</Hint>
        </div>

        {/* ── PRÉVIA ── */}
        <div>
          <SectionTitle>Prévia · como uma IA citaria</SectionTitle>
          <AiPreview geo={geo} seoTitle={seoTitle} brandName={brandName} />
        </div>

        <Divider />

        {/* ── RESUMO FACTUAL ── */}
        <div>
          <SectionTitle>Resumo factual</SectionTitle>
          <textarea
            value={geo.summary ?? ""}
            onChange={(e) => up({ summary: e.target.value || undefined })}
            style={{ ...fieldStyle, lineHeight: 1.55 }}
            rows={5}
            placeholder="O Menu de Inverno 2026 do Lush Motel oferece fondue de queijo e de chocolate servidos na suíte, nas unidades Ipiranga e Lapa, de R$ 295 a R$ 444, até 31 de julho de 2026."
          />
          <CharCount value={geo.summary} max={300} />
          <Hint>
            Frases declarativas, sem adjetivo de venda. Inclua <strong>o que é</strong>, <strong>onde</strong>,{" "}
            <strong>quanto custa</strong> e <strong>até quando</strong> — o modelo cita este texto quase literalmente.
          </Hint>
        </div>

        <Divider />

        {/* ── PONTOS-CHAVE ── */}
        <div>
          <SectionTitle>Pontos-chave</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {facts.map((fact, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#55526A", flexShrink: 0 }}>•</span>
                <input
                  type="text"
                  value={fact}
                  onChange={(e) => setFacts(facts.map((f, j) => (j === i ? e.target.value : f)))}
                  style={{ ...fieldStyle, fontSize: 12, padding: "6px 9px" }}
                  placeholder="Ex: Fondue de queijo e de chocolate"
                />
                <button
                  type="button"
                  onClick={() => setFacts(facts.filter((_, j) => j !== i))}
                  style={{ background: "transparent", border: "none", color: "#55526A", cursor: "pointer", fontSize: 14, padding: "0 2px", flexShrink: 0, lineHeight: 1 }}
                  aria-label="Remover ponto-chave"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFacts([...facts, ""])}
              style={{
                background: "transparent", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 6,
                padding: "6px 0", color: "#55526A", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
              }}
            >
              + Adicionar ponto-chave
            </button>
          </div>
          <Hint>Fatos curtos e independentes. LLMs extraem listas com muito mais fidelidade do que prosa corrida.</Hint>
        </div>

        <Divider />

        {/* ── PREÇO E VALIDADE ── */}
        <div>
          <SectionTitle>Preço e validade</SectionTitle>
          {/* Preço em 2 colunas: número é curto e cabe. */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <FieldLabel>Preço mín.</FieldLabel>
              <input
                type="number"
                min={0}
                value={geo.priceLow ?? ""}
                onChange={(e) => up({ priceLow: e.target.value === "" ? undefined : Number(e.target.value) })}
                style={{ ...fieldStyle, fontSize: 12 }}
                placeholder="295"
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <FieldLabel>Preço máx.</FieldLabel>
              <input
                type="number"
                min={0}
                value={geo.priceHigh ?? ""}
                onChange={(e) => up({ priceHigh: e.target.value === "" ? undefined : Number(e.target.value) })}
                style={{ ...fieldStyle, fontSize: 12 }}
                placeholder="444"
              />
            </div>
          </div>

          {/* Datas empilhadas: input[type=date] tem largura mínima intrínseca
              de ~130px, que estoura uma coluna de 94px e cria scroll lateral. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <div style={{ minWidth: 0 }}>
              <FieldLabel>Válido de</FieldLabel>
              <input
                type="date"
                value={geo.validFrom ?? ""}
                onChange={(e) => up({ validFrom: e.target.value || undefined })}
                style={{ ...fieldStyle, fontSize: 12, colorScheme: "dark" }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <FieldLabel>Válido até</FieldLabel>
              <input
                type="date"
                value={geo.validThrough ?? ""}
                onChange={(e) => up({ validThrough: e.target.value || undefined })}
                style={{ ...fieldStyle, fontSize: 12, colorScheme: "dark" }}
              />
            </div>
          </div>
          <Hint>A data-limite impede que o modelo recomende a campanha depois de encerrada.</Hint>
        </div>

        <Divider />

        {/* ── AVANÇADO ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <SectionTitle>Avançado</SectionTitle>

          {/* Tipo de conteúdo */}
          <Collapsible title="Tipo de conteúdo" badge={geo.contentType ?? "Offer"}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {([
                ["Offer",   "Oferta",  "Promoção ou pacote com preço"],
                ["Event",   "Evento",  "Data de início e fim definidas"],
                ["Product", "Produto", "Item vendável e recorrente"],
                ["Service", "Serviço", "Experiência ou atendimento"],
              ] as const).map(([val, label, desc]) => {
                const active = (geo.contentType ?? "Offer") === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => up({ contentType: val })}
                    style={{
                      padding: "7px 8px", borderRadius: 6, cursor: "pointer", textAlign: "left" as const,
                      border: `1px solid ${active ? "#A67CFF" : "rgba(255,255,255,0.08)"}`,
                      background: active ? "rgba(166,124,255,0.14)" : "transparent",
                      fontFamily: "inherit", minWidth: 0, overflowWrap: "anywhere" as const,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: active ? "#A67CFF" : "#8E8AA8" }}>{label}</div>
                    <div style={{ fontSize: 9, color: "#3A3850", marginTop: 2, lineHeight: 1.35 }}>{desc}</div>
                  </button>
                );
              })}
            </div>
            <Hint>Define a entidade schema.org principal emitida no JSON-LD da página.</Hint>
          </Collapsible>

          {/* Q&A */}
          <Collapsible title="Perguntas & respostas para IA" badge={qa.length ? String(qa.length) : undefined}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {qa.map((item, i) => (
                <div key={i} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: 8 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                    <input
                      type="text"
                      value={item.q}
                      onChange={(e) => setQa(qa.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                      style={{ ...fieldStyle, fontSize: 12, padding: "5px 8px", fontWeight: 600 }}
                      placeholder="Pergunta"
                    />
                    <button
                      type="button"
                      onClick={() => setQa(qa.filter((_, j) => j !== i))}
                      style={{ background: "transparent", border: "none", color: "#55526A", cursor: "pointer", fontSize: 14, padding: "0 2px", flexShrink: 0, lineHeight: 1 }}
                      aria-label="Remover pergunta"
                    >
                      ×
                    </button>
                  </div>
                  <textarea
                    value={item.a}
                    onChange={(e) => setQa(qa.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                    style={{ ...fieldStyle, fontSize: 12, padding: "5px 8px" }}
                    rows={2}
                    placeholder="Resposta direta e factual"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setQa([...qa, { q: "", a: "" }])}
                style={{
                  background: "transparent", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 6,
                  padding: "6px 0", color: "#55526A", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                }}
              >
                + Adicionar pergunta
              </button>
            </div>
            <Hint>Vazio → o JSON-LD usa automaticamente as perguntas do bloco FAQ. Preencha aqui só se quiser respostas em tom mais direto do que a copy da LP.</Hint>
          </Collapsible>

          {/* Público-alvo */}
          <Collapsible title="Público-alvo" badge={geo.audience?.trim() ? "✓" : undefined}>
            <input
              type="text"
              value={geo.audience ?? ""}
              onChange={(e) => up({ audience: e.target.value || undefined })}
              style={{ ...fieldStyle, fontSize: 12 }}
              placeholder="Ex: casais maiores de 18 anos em São Paulo"
            />
            <Hint>Vira <code style={{ color: "#8E8AA8" }}>schema.org/Audience</code> — ajuda o modelo a recomendar a página para a pessoa certa.</Hint>
          </Collapsible>

          {/* Crawlers de IA */}
          <Collapsible title="Crawlers de IA" badge={crawlers === "block" ? "bloqueado" : undefined}>
            <div style={{ display: "flex", gap: 6 }}>
              {([
                ["allow", "✓  Permitir"],
                ["block", "✗  Bloquear"],
              ] as const).map(([val, label]) => {
                const active = crawlers === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => up({ aiCrawlers: val })}
                    style={{
                      flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${active ? "#A67CFF" : "rgba(255,255,255,0.08)"}`,
                      background: active ? "rgba(166,124,255,0.18)" : "transparent",
                      color: active ? "#A67CFF" : "#55526A", fontFamily: "inherit",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <Hint>
              {crawlers === "block"
                ? "⚠ Emite noai/noimageai no meta robots. A campanha deixa de ser citável em respostas de IA."
                : "Padrão. A campanha pode ser citada por ChatGPT, Perplexity e AI Overviews."}
            </Hint>
            <Hint>
              Controle por campanha, via meta tag. No nível do site, o{" "}
              <code style={{ color: "#8E8AA8" }}>robots.txt</code> já libera GPTBot, ClaudeBot, PerplexityBot,
              Google-Extended e Applebot-Extended — bloquear ali exige mudar <code style={{ color: "#8E8AA8" }}>app/robots.ts</code>.
            </Hint>
          </Collapsible>
        </div>

        <Divider />

        {/* ── SCORE ── */}
        <div>
          <SectionTitle>Completude</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: scoreColor, borderRadius: 3, transition: "width 200ms" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor, flexShrink: 0 }}>{done}/{checks.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {checks.map((c) => (
              <div key={c.label} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                <span style={{ fontSize: 10, color: c.ok ? "#2EB87A" : "#3A3850", flexShrink: 0, marginTop: 1 }}>
                  {c.ok ? "✓" : "○"}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: c.ok ? "#55526A" : "#A8A0BE", fontWeight: c.ok ? 400 : 600 }}>{c.label}</div>
                  {!c.ok && <div style={{ fontSize: 10, color: "#3A3850", lineHeight: 1.4, marginTop: 1 }}>{c.hint}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SAVE ── */}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={{
            background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6,
            padding: "10px 0", fontSize: 12, fontWeight: 700,
            cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1,
            marginTop: 4,
          }}
        >
          {saving ? "Salvando…" : "Salvar GEO"}
        </button>

      </div>
    </div>
  );
}
