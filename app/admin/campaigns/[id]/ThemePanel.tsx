"use client";

export type Theme = Record<string, string>;

const COLOR_KEYS = new Set([
  "bg","bgElev","bgCard",
  "ink","inkMut","inkDim","inkDeep",
  "lavender","lavenderSoft","lavenderDeep","lavBright",
  "emerald","emeraldSoft","emeraldDeep",
  "green","greenDeep","red","redDeep",
]);

const LABELS: Record<string, string> = {
  bg: "Fundo", bgElev: "Fundo elevado", bgCard: "Card",
  ink: "Texto", inkMut: "Texto muted", inkDim: "Texto dim", inkDeep: "Texto deep",
  lavender: "Primária", lavenderSoft: "Primária suave", lavenderDeep: "Primária deep", lavBright: "Primária brilho",
  emerald: "Esmeralda", emeraldSoft: "Esmeralda suave", emeraldDeep: "Esmeralda deep",
  green: "Verde", greenDeep: "Verde deep", red: "Vermelho", redDeep: "Vermelho deep",
  line: "Borda", lineSoft: "Borda suave",
  lavenderGrad: "Gradiente primário", emeraldGrad: "Gradiente esmeralda",
};

const GROUPS = [
  { label: "Fundos",         keys: ["bg","bgElev","bgCard"] },
  { label: "Textos",         keys: ["ink","inkMut","inkDim","inkDeep"] },
  { label: "Cor primária",   keys: ["lavender","lavenderSoft","lavenderDeep","lavBright"] },
  { label: "Esmeralda",      keys: ["emerald","emeraldSoft","emeraldDeep"] },
  { label: "Verde / Alerta", keys: ["green","greenDeep","red","redDeep"] },
  { label: "Bordas & Gradientes", keys: ["line","lineSoft","lavenderGrad","emeraldGrad"] },
];

interface Props {
  theme: Theme;
  onChange: (t: Theme) => void;
  saving: boolean;
  onSave: () => void;
}

export function ThemePanel({ theme, onChange, saving, onSave }: Props) {
  function update(key: string, val: string) {
    onChange({ ...theme, [key]: val });
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 0" }}>
      {GROUPS.map((g) => (
        <div key={g.label} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#55526A", marginBottom: 8 }}>
            {g.label}
          </div>
          {g.keys.map((key) => {
            const val = theme[key] ?? "";
            const isColor = COLOR_KEYS.has(key) && val.startsWith("#");
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                {isColor ? (
                  <input
                    type="color"
                    value={val}
                    onChange={(e) => update(key, e.target.value)}
                    style={{ width: 26, height: 22, padding: 1, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, cursor: "pointer", background: "none", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 26, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: val.startsWith("#") ? val : "rgba(255,255,255,0.04)", flexShrink: 0 }} />
                )}
                <input
                  type="text"
                  value={val}
                  onChange={(e) => update(key, e.target.value)}
                  style={{
                    flex: 1, minWidth: 0,
                    background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 5, padding: "4px 7px", color: "#F0EEF8", fontSize: 10,
                    outline: "none", fontFamily: "monospace",
                  }}
                />
                <span style={{ fontSize: 9, color: "#55526A", minWidth: 72, textAlign: "right", flexShrink: 0 }}>
                  {LABELS[key] ?? key}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, paddingBottom: 16, paddingTop: 4 }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            flex: 1, background: "#A67CFF", color: "#fff", border: "none",
            borderRadius: 6, padding: "8px 0", fontSize: 12, fontWeight: 700,
            cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Salvando…" : "Salvar tema"}
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(JSON.stringify(theme, null, 2))}
          title="Copiar JSON do tema"
          style={{
            background: "rgba(255,255,255,0.05)", color: "#55526A",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
            padding: "8px 10px", fontSize: 11, cursor: "pointer",
          }}
        >
          {}
        </button>
      </div>
    </div>
  );
}
