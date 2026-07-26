"use client";
import { useState, useEffect } from "react";

/* ── tipos ──────────────────────────────────────────── */
interface Category { id: string; name: string; slug: string; }
interface UnitData  { id: string; name: string; categories: { all: Category[]; "3h"?: Category[] }; }
interface Period    { id: string; label: string; shortLabel: string; }
type PriceCell      = { premium: number; regular: number };
type PriceMap       = Record<string, Record<string, Record<string, PriceCell>>>;  // unit→cat→period

interface Props {
  open:       boolean;
  onClose:    () => void;
  campaignId: string;
  brandId:    string;
}

/* ── helpers ────────────────────────────────────────── */
function centsToStr(c: number) {
  return c > 0 ? (c / 100).toFixed(2).replace(".", ",") : "";
}
function strToCents(s: string): number {
  const n = parseFloat(s.replace(",", ".").replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

const inp: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 4, padding: "4px 6px", color: "#F0EEF8", fontSize: 11,
  outline: "none", fontFamily: "monospace", textAlign: "right",
};

/* ═══════════════════════════════════════════════════ */
export function PricingPanel({ open, onClose, campaignId, brandId }: Props) {
  const [periods, setPeriods]   = useState<Period[]>([]);
  const [units,   setUnits]     = useState<UnitData[]>([]);
  const [pricing, setPricing]   = useState<PriceMap>({});
  const [loading, setLoading]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState("");
  const [saved,   setSaved]     = useState(false);
  const [selUnit, setSelUnit]   = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}/data`).then((r) => r.json() as Promise<{ periods?: Period[]; pricing?: { currency: string; units: PriceMap } }>),
      fetch(`/api/admin/brands/${brandId}`).then((r) => r.json() as Promise<{ units?: UnitData[] }>),
    ]).then(([cd, br]) => {
      const p = cd.periods ?? [];
      const u = (br.units ?? []).filter((u) => u.categories?.all?.length);
      setPeriods(p);
      setUnits(u);
      setPricing(cd.pricing?.units ?? {});
      if (u.length > 0 && !selUnit) setSelUnit(u[0]!.id);
    }).catch(() => setError("Erro ao carregar dados."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId, brandId]);

  if (!open) return null;

  const activeUnit = units.find((u) => u.id === selUnit);
  const categories = activeUnit?.categories.all ?? [];

  function getCell(unitId: string, catSlug: string, periodId: string): PriceCell {
    return pricing[unitId]?.[catSlug]?.[periodId] ?? { premium: 0, regular: 0 };
  }

  function setCell(unitId: string, catSlug: string, periodId: string, tier: "premium" | "regular", val: string) {
    setPricing((prev) => {
      const cents = strToCents(val);
      const unitMap  = { ...(prev[unitId]  ?? {}) };
      const catMap   = { ...(unitMap[catSlug]  ?? {}) };
      const cell     = { ...(catMap[periodId]  ?? { premium: 0, regular: 0 }), [tier]: cents };
      catMap[periodId]  = cell;
      unitMap[catSlug]  = catMap;
      return { ...prev, [unitId]: unitMap };
    });
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_data: { pricing: { currency: "BRL", units: pricing } } }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#13121A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, width: "100%", maxWidth: 780, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 15 }}>📊</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F0EEF8" }}>Tabela de preços</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>

        {/* Body */}
        <div className="admin-scroll" style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {loading && <div style={{ textAlign: "center", color: "#55526A", padding: 32, fontSize: 13 }}>Carregando…</div>}

          {!loading && periods.length === 0 && (
            <div style={{ background: "rgba(255,200,0,0.06)", border: "1px solid rgba(255,200,0,0.15)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#C8A03A", lineHeight: 1.6 }}>
              Nenhum período encontrado em <code>campaign_data.periods</code>. Configure os períodos primeiro (edite o JSON ou cole via aba Código).
            </div>
          )}

          {!loading && periods.length > 0 && (
            <>
              {/* Unit tabs */}
              {units.length > 1 && (
                <div style={{ display: "flex", gap: 4 }}>
                  {units.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelUnit(u.id)}
                      style={{
                        padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                        background: selUnit === u.id ? "rgba(166,124,255,0.18)" : "rgba(255,255,255,0.04)",
                        color: selUnit === u.id ? "#A67CFF" : "#8E8AA8",
                      }}
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Price grid */}
              {activeUnit && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "6px 10px", textAlign: "left", color: "#55526A", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", minWidth: 140, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          Categoria
                        </th>
                        {periods.map((p) => (
                          <th key={p.id} colSpan={2} style={{ padding: "6px 8px", textAlign: "center", color: "#8E8AA8", fontWeight: 600, fontSize: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>
                            {p.shortLabel}
                            <div style={{ fontSize: 8, color: "#3A3850", fontWeight: 400, fontFamily: "monospace" }}>{p.id}</div>
                          </th>
                        ))}
                      </tr>
                      <tr>
                        <td style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }} />
                        {periods.flatMap((p) => [
                          <td key={`${p.id}-prem-h`} style={{ padding: "2px 6px", textAlign: "center", fontSize: 8, color: "#F0A84A", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>PREM</td>,
                          <td key={`${p.id}-reg-h`}  style={{ padding: "2px 6px", textAlign: "center", fontSize: 8, color: "#8E8AA8", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>REG</td>,
                        ])}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat, ri) => (
                        <tr key={cat.id} style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                          <td style={{ padding: "6px 10px", color: "#C4AEFF", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>
                            {cat.name}
                            <div style={{ fontSize: 9, color: "#55526A", fontFamily: "monospace", fontWeight: 400 }}>{cat.slug}</div>
                          </td>
                          {periods.flatMap((p) => {
                            const cell = getCell(activeUnit.id, cat.slug, p.id);
                            return [
                              <td key={`${cat.id}-${p.id}-prem`} style={{ padding: "4px 4px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                  <span style={{ fontSize: 9, color: "#55526A", flexShrink: 0 }}>R$</span>
                                  <input
                                    style={{ ...inp, width: 76 }}
                                    value={centsToStr(cell.premium)}
                                    onChange={(e) => setCell(activeUnit.id, cat.slug, p.id, "premium", e.target.value)}
                                    placeholder="0,00"
                                  />
                                </div>
                              </td>,
                              <td key={`${cat.id}-${p.id}-reg`} style={{ padding: "4px 4px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                  <span style={{ fontSize: 9, color: "#55526A", flexShrink: 0 }}>R$</span>
                                  <input
                                    style={{ ...inp, width: 76 }}
                                    value={centsToStr(cell.regular)}
                                    onChange={(e) => setCell(activeUnit.id, cat.slug, p.id, "regular", e.target.value)}
                                    placeholder="0,00"
                                  />
                                </div>
                              </td>,
                            ];
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ fontSize: 10, color: "#3A3850", lineHeight: 1.6 }}>
                Valores em R$ (centavos internamente). Premium = datas de pico (fins de semana/feriados). Regular = demais datas.
              </div>
            </>
          )}

          {error && <div style={{ fontSize: 11, color: "#E05260", padding: "8px 12px", background: "rgba(224,82,96,0.08)", borderRadius: 6 }}>{error}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {saved && <span style={{ fontSize: 11, color: "#2EB87A" }}>✓ Preços salvos</span>}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 16px", color: "#8E8AA8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Fechar</button>
          <button onClick={save} disabled={saving || periods.length === 0} style={{ background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 12, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving || periods.length === 0 ? 0.5 : 1 }}>
            {saving ? "Salvando…" : "Salvar preços"}
          </button>
        </div>
      </div>
    </div>
  );
}
