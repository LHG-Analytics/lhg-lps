"use client";
import { useState, useEffect } from "react";

/* ── tipos ──────────────────────────────────────────── */
export interface Period {
  id: string;
  label: string;
  shortLabel: string;
  meta: string;
  scope: string;
  scopeKey: "3h" | "all";
  inclusos: string;
  featured?: boolean;
  featuredTag?: string;
}

export interface CampaignDate {
  value: string;
  day: string;
  dow: string;
  tier: "premium" | "regular";
  label: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}

const DOW_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

function dateFromValue(value: string): { day: string; dow: string } {
  if (!value) return { day: "", dow: "" };
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return { day: String(d!).padStart(2, "0"), dow: DOW_PT[dt.getDay()]! };
}

function blankPeriod(): Period {
  return { id: "", label: "", shortLabel: "", meta: "", scope: "Todas as categorias", scopeKey: "all", inclusos: "" };
}
function blankDate(): CampaignDate {
  const today = new Date().toISOString().slice(0, 10);
  const { day, dow } = dateFromValue(today);
  return { value: today, day, dow, tier: "regular", label: "" };
}

const fld: React.CSSProperties = {
  background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "5px 9px", color: "#F0EEF8", fontSize: 12,
  outline: "none", fontFamily: "inherit", width: "100%",
};

/* ── PeriodRow ──────────────────────────────────────── */
function PeriodRow({ p, onChange, onRemove }: {
  p: Period;
  onChange: (p: Period) => void;
  onRemove: () => void;
}) {
  function set<K extends keyof Period>(k: K, v: Period[K]) { onChange({ ...p, [k]: v }); }
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 28px", gap: 6, alignItems: "end" }}>
        <div>
          <div style={{ fontSize: 8, color: "#55526A", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>ID</div>
          <input value={p.id} onChange={(e) => set("id", e.target.value)} style={{ ...fld, fontFamily: "monospace" }} placeholder="3h-18" />
        </div>
        <div>
          <div style={{ fontSize: 8, color: "#55526A", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Rótulo completo</div>
          <input value={p.label} onChange={(e) => set("label", e.target.value)} style={fld} placeholder="3 horas · 18:00 – 21:00" />
        </div>
        <div>
          <div style={{ fontSize: 8, color: "#55526A", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Rótulo curto</div>
          <input value={p.shortLabel} onChange={(e) => set("shortLabel", e.target.value)} style={fld} placeholder="3 horas" />
        </div>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#E05260", cursor: "pointer", fontSize: 13, alignSelf: "flex-end", paddingBottom: 6 }}>✕</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 6 }}>
        <div>
          <div style={{ fontSize: 8, color: "#55526A", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Inclusos (exibido no resumo)</div>
          <input value={p.inclusos} onChange={(e) => set("inclusos", e.target.value)} style={fld} placeholder="Buquê · 2 Welcome Drinks" />
        </div>
        <div>
          <div style={{ fontSize: 8, color: "#55526A", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Scope</div>
          <select value={p.scopeKey} onChange={(e) => set("scopeKey", e.target.value as "3h" | "all")} style={{ ...fld, cursor: "pointer" }}>
            <option value="all">all</option>
            <option value="3h">3h</option>
          </select>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 8, color: "#55526A", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Meta (incluso resumido no card)</div>
        <input value={p.meta} onChange={(e) => set("meta", e.target.value)} style={fld} placeholder="Buquê de rosas · Pacote gastronômico" />
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: "#8E8AA8" }}>
          <input type="checkbox" checked={p.featured ?? false} onChange={(e) => set("featured", e.target.checked)} style={{ accentColor: "#A67CFF" }} />
          Destaque
        </label>
        {p.featured && (
          <div style={{ flex: 1 }}>
            <input value={p.featuredTag ?? ""} onChange={(e) => set("featuredTag", e.target.value)} style={{ ...fld, fontSize: 11 }} placeholder="★ Experiência completa" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── DateRow ────────────────────────────────────────── */
function DateRow({ d, onChange, onRemove }: {
  d: CampaignDate;
  onChange: (d: CampaignDate) => void;
  onRemove: () => void;
}) {
  function setVal(v: string) {
    const { day, dow } = dateFromValue(v);
    onChange({ ...d, value: v, day, dow });
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 80px 1fr 28px", gap: 6, alignItems: "center", padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 6 }}>
      <input type="date" value={d.value} onChange={(e) => setVal(e.target.value)}
        style={{ ...fld, colorScheme: "dark", fontFamily: "monospace" }} />
      <select value={d.tier} onChange={(e) => onChange({ ...d, tier: e.target.value as "premium" | "regular" })}
        style={{ ...fld, cursor: "pointer" }}>
        <option value="regular">Regular</option>
        <option value="premium">Premium</option>
      </select>
      <input value={d.label} onChange={(e) => onChange({ ...d, label: e.target.value })}
        style={{ ...fld, fontSize: 11 }} placeholder="Feriado, Especial…" />
      <button onClick={onRemove} style={{ background: "none", border: "none", color: "#E05260", cursor: "pointer", fontSize: 12 }}>✕</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
export function PeriodsPanel({ open, onClose, campaignId }: Props) {
  const [tab,     setTab]     = useState<"periods" | "dates">("periods");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [dates,   setDates]   = useState<CampaignDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/admin/campaigns/${campaignId}/data`)
      .then((r) => r.json() as Promise<{ periods?: Period[]; dates?: CampaignDate[] }>)
      .then((d) => { setPeriods(d.periods ?? []); setDates(d.dates ?? []); })
      .catch(() => setError("Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, [open, campaignId]);

  if (!open) return null;

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_data: { periods, dates } }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally { setSaving(false); }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#13121A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, width: "100%", maxWidth: 660, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 15 }}>🗓</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F0EEF8" }}>Períodos & Datas</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: 2 }}>
            {(["periods", "dates"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "4px 14px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: tab === t ? "#1E1E2A" : "transparent",
                color: tab === t ? "#A67CFF" : "#55526A",
              }}>
                {t === "periods" ? `Períodos (${periods.length})` : `Datas (${dates.length})`}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {loading && <div style={{ textAlign: "center", color: "#55526A", fontSize: 13, padding: 24 }}>Carregando…</div>}

          {!loading && tab === "periods" && (
            <>
              <div style={{ fontSize: 11, color: "#8E8AA8", lineHeight: 1.6 }}>
                Períodos definem as opções de horário disponíveis no wizard de reserva. O campo <code style={{ color: "#A67CFF" }}>scopeKey</code> controla quais categorias são exibidas.
              </div>
              {periods.map((p, i) => (
                <PeriodRow key={i} p={p}
                  onChange={(np) => setPeriods((prev) => prev.map((x, j) => j === i ? np : x))}
                  onRemove={() => setPeriods((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
              <button onClick={() => setPeriods((prev) => [...prev, blankPeriod()])}
                style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 8, padding: "9px 0", color: "#8E8AA8", cursor: "pointer", fontSize: 12, textAlign: "center" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(166,124,255,0.35)"; e.currentTarget.style.color = "#C4AEFF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#8E8AA8"; }}
              >+ Adicionar período</button>
            </>
          )}

          {!loading && tab === "dates" && (
            <>
              <div style={{ fontSize: 11, color: "#8E8AA8", lineHeight: 1.6 }}>
                Datas disponíveis no wizard. <strong style={{ color: "#F0A84A" }}>Premium</strong> = pico (fins de semana, feriados). O dia da semana é calculado automaticamente ao escolher a data.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "140px 80px 1fr 28px", gap: 6, padding: "0 8px" }}>
                <div style={{ fontSize: 8, color: "#3A3850", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Data</div>
                <div style={{ fontSize: 8, color: "#3A3850", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Tier</div>
                <div style={{ fontSize: 8, color: "#3A3850", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Rótulo (opcional)</div>
                <div />
              </div>
              {dates.map((d, i) => (
                <DateRow key={i} d={d}
                  onChange={(nd) => setDates((prev) => prev.map((x, j) => j === i ? nd : x))}
                  onRemove={() => setDates((prev) => prev.filter((_, j) => j !== i))}
                />
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setDates((prev) => [...prev, blankDate()])}
                  style={{ flex: 1, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 8, padding: "9px 0", color: "#8E8AA8", cursor: "pointer", fontSize: 12 }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(166,124,255,0.35)"; e.currentTarget.style.color = "#C4AEFF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#8E8AA8"; }}
                >+ Adicionar data</button>
              </div>
            </>
          )}

          {error && <div style={{ fontSize: 11, color: "#E05260", padding: "8px 12px", background: "rgba(224,82,96,0.08)", borderRadius: 6 }}>{error}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {saved && <span style={{ fontSize: 11, color: "#2EB87A" }}>✓ Salvo</span>}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 16px", color: "#8E8AA8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Fechar</button>
          <button onClick={save} disabled={saving} style={{ background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 12, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
