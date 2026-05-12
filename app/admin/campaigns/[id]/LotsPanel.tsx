"use client";
import { useState } from "react";

export interface Lot {
  id: string;
  name: string;
  discountPct: number;
  coupon?: string;
  from?: string;
  to?: string;
  before?: string;
  after?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  initialLots: Lot[];
  onSaved: (lots: Lot[]) => void;
}

const fld: React.CSSProperties = {
  background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "6px 10px", color: "#F0EEF8", fontSize: 12,
  outline: "none", fontFamily: "inherit", width: "100%",
};

function blank(): Lot {
  return { id: `lote-${Date.now()}`, name: "Novo lote", discountPct: 0 };
}

function LotRow({ lot, onChange, onRemove }: {
  lot: Lot;
  onChange: (l: Lot) => void;
  onRemove: () => void;
}) {
  function set<K extends keyof Lot>(k: K, v: Lot[K]) {
    onChange({ ...lot, [k]: v });
  }

  const gateOptions: { key: keyof Lot; label: string; ph: string }[] = [
    { key: "from",   label: "De",      ph: "2026-01-01" },
    { key: "to",     label: "Até",     ph: "2026-01-31" },
    { key: "before", label: "Antes de", ph: "2026-01-01" },
    { key: "after",  label: "Após",    ph: "2026-01-31" },
  ];

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Header row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={lot.name}
          onChange={(e) => set("name", e.target.value)}
          style={{ ...fld, flex: 1, fontSize: 13, fontWeight: 600 }}
          placeholder="Nome do lote"
        />
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#E05260", cursor: "pointer", fontSize: 13, padding: "0 6px", flexShrink: 0 }} title="Remover lote">✕</button>
      </div>

      {/* ID + desconto + cupom */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: "#55526A", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>ID</div>
          <input
            value={lot.id}
            onChange={(e) => set("id", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            style={{ ...fld, fontFamily: "monospace" }}
            placeholder="lote-1"
          />
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#55526A", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Desconto %</div>
          <input
            type="number"
            min={0}
            max={100}
            value={lot.discountPct}
            onChange={(e) => set("discountPct", Number(e.target.value))}
            style={fld}
          />
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#55526A", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Cupom</div>
          <input
            value={lot.coupon ?? ""}
            onChange={(e) => set("coupon", e.target.value.toUpperCase() || undefined)}
            style={{ ...fld, fontFamily: "monospace" }}
            placeholder="PROMO25"
          />
        </div>
      </div>

      {/* Gates de data */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {gateOptions.map(({ key, label, ph }) => (
          <div key={key}>
            <div style={{ fontSize: 9, color: "#55526A", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
            <input
              type="date"
              value={(lot[key] as string | undefined)?.slice(0, 10) ?? ""}
              onChange={(e) => set(key, e.target.value || undefined)}
              style={{ ...fld, colorScheme: "dark" }}
              placeholder={ph}
            />
          </div>
        ))}
      </div>

      {/* Preview do estado */}
      <LotStatus lot={lot} />
    </div>
  );
}

function LotStatus({ lot }: { lot: Lot }) {
  const today = new Date().toISOString().slice(0, 10);
  let status = "Sem gate de data";
  let color = "#55526A";

  if (lot.before && today >= lot.before) { status = "Pré-abertura (exibido antes de " + lot.before + ")"; color = "#8E8AA8"; }
  else if (lot.after && today > lot.after)  { status = "Encerrado (após " + lot.after + ")"; color = "#E05260"; }
  else if (lot.from && lot.to) {
    if (today < lot.from) { status = `Futuro — abre ${lot.from}`; color = "#F0A84A"; }
    else if (today <= lot.to) { status = `Ativo — até ${lot.to}`; color = "#2EB87A"; }
    else { status = `Encerrado (${lot.to})`; color = "#E05260"; }
  }

  return (
    <div style={{ fontSize: 10, color, display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {status}
    </div>
  );
}

export function LotsPanel({ open, onClose, campaignId, initialLots, onSaved }: Props) {
  const [lots,   setLots]   = useState<Lot[]>(initialLots);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [saved,  setSaved]  = useState(false);

  if (!open) return null;

  function updateLot(i: number, l: Lot) {
    setLots((prev) => prev.map((x, j) => j === i ? l : x));
  }
  function removeLot(i: number) {
    setLots((prev) => prev.filter((_, j) => j !== i));
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_data: { lots } }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved(lots);
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
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#13121A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, width: "100%", maxWidth: 620, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 15 }}>🏷</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F0EEF8" }}>Lotes & Cupons</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: "#8E8AA8", lineHeight: 1.6 }}>
            Os lotes controlam o desconto ativo e o cupom exibido na LP. O lote com gate de data ativo é selecionado automaticamente por <code style={{ color: "#A67CFF", fontSize: 11 }}>lib/lots.ts</code>.
          </div>

          {lots.length === 0 && (
            <div style={{ fontSize: 12, color: "#3A3850", textAlign: "center", padding: "24px 0" }}>
              Nenhum lote configurado.
            </div>
          )}

          {lots.map((lot, i) => (
            <LotRow
              key={lot.id + i}
              lot={lot}
              onChange={(l) => updateLot(i, l)}
              onRemove={() => removeLot(i)}
            />
          ))}

          <button
            onClick={() => setLots((l) => [...l, blank()])}
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 0", color: "#8E8AA8", cursor: "pointer", fontSize: 12, textAlign: "center" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(166,124,255,0.35)"; e.currentTarget.style.color = "#C4AEFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#8E8AA8"; }}
          >
            + Adicionar lote
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {error && <span style={{ fontSize: 11, color: "#E05260", flex: 1 }}>{error}</span>}
          {saved && <span style={{ fontSize: 11, color: "#2EB87A" }}>✓ Salvo</span>}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 18px", color: "#8E8AA8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Fechar
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{ background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 12, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Salvando…" : "Salvar lotes"}
          </button>
        </div>
      </div>
    </div>
  );
}
