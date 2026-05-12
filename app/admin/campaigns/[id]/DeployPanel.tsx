"use client";
import { useState } from "react";

export type DeployMode = "subdomain" | "subdirectory" | null;

export interface DeployConfig {
  mode: DeployMode;
  domain: string;    // subdomínio/domínio para modo subdomain
  basePath: string;  // ex: /pt-BR/diadosnamorados2026 para modo subdirectory
}

interface VercelDomain {
  name: string;
  verified: boolean;
  cnames?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  initial: DeployConfig;
  onSaved: (cfg: DeployConfig) => void;
}

const fld: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "7px 10px", color: "#F0EEF8", fontSize: 13,
  outline: "none", fontFamily: "monospace",
};

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 8, padding: 14,
};

export function DeployPanel({ open, onClose, campaignId, initial, onSaved }: Props) {
  const [mode, setMode]           = useState<DeployMode>(initial.mode);
  const [domain, setDomain]       = useState(initial.domain);
  const [basePath, setBasePath]   = useState(initial.basePath);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [vercelAdding, setVercelAdding] = useState(false);
  const [vercelDomain, setVercelDomain] = useState<VercelDomain | null>(null);
  const [vercelError, setVercelError]   = useState("");

  if (!open) return null;

  // Deriva o hostname do Vercel para o guia CloudFront
  const vercelHost = typeof window !== "undefined"
    ? window.location.hostname
    : "lhg-lps.vercel.app";

  async function save() {
    setSaving(true); setError("");
    const body: Record<string, unknown> = {
      custom_domain: mode === "subdomain"    ? domain.trim()   || null : null,
      base_path:     mode === "subdirectory" ? basePath.trim() || null : null,
    };
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved({ mode, domain, basePath });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function addToVercel() {
    if (!domain.trim()) return;
    setVercelAdding(true); setVercelError(""); setVercelDomain(null);
    try {
      const res = await fetch("/api/admin/vercel/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error(String(data) ?? "Erro");
      setVercelDomain({
        name:     String(data.name ?? domain),
        verified: Boolean(data.verified),
        cnames:   Array.isArray(data.cnames) ? data.cnames as string[] : ["cname.vercel-dns.com"],
      });
    } catch (e) {
      setVercelError(e instanceof Error ? e.message : "Erro na API Vercel.");
    } finally {
      setVercelAdding(false);
    }
  }

  // Extrai o label do CNAME (parte antes do primeiro ponto do domínio)
  const cnameName  = domain.trim().split(".")[0] ?? domain.trim();
  const cnameValue = vercelDomain?.cnames?.[0] ?? "cname.vercel-dns.com";

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#13121A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 24, width: 480, maxHeight: "88dvh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F0EEF8" }}>🌐 Configurar deploy</div>
            <div style={{ fontSize: 11, color: "#55526A", marginTop: 2 }}>Escolha como esta campanha será servida ao público</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#55526A", cursor: "pointer", fontSize: 16, padding: "4px 6px" }}>✕</button>
        </div>

        {/* Modo */}
        <div>
          <div style={{ fontSize: 10, color: "#8E8AA8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Modo de deploy</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["subdomain", "subdirectory"] as DeployMode[]).map((m) => (
              <button
                key={m!}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12,
                  border: mode === m ? "1px solid rgba(166,124,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  background: mode === m ? "rgba(166,124,255,0.12)" : "rgba(255,255,255,0.03)",
                  color: mode === m ? "#A67CFF" : "#55526A",
                }}
              >
                {m === "subdomain" ? "🔗 Subdomínio" : "📁 Subdiretório"}
              </button>
            ))}
          </div>
          {mode === null && (
            <div style={{ fontSize: 11, color: "#3A3850", marginTop: 6 }}>Selecione um modo para configurar.</div>
          )}
        </div>

        {/* ── SUBDOMAIN ────────────────────────────── */}
        {mode === "subdomain" && (
          <>
            <div>
              <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Domínio personalizado</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="ex: namorados2026.lushmotel.com.br"
                  style={{ ...fld, flex: 1 }}
                />
                <button
                  onClick={addToVercel}
                  disabled={vercelAdding || !domain.trim()}
                  style={{
                    background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6,
                    padding: "0 14px", fontSize: 12, fontWeight: 700,
                    cursor: vercelAdding || !domain.trim() ? "default" : "pointer",
                    opacity: vercelAdding || !domain.trim() ? 0.5 : 1, whiteSpace: "nowrap",
                  }}
                >
                  {vercelAdding ? "…" : "Adicionar no Vercel"}
                </button>
              </div>
              {vercelError && <div style={{ fontSize: 11, color: "#E05260", marginTop: 5 }}>{vercelError}</div>}
              <div style={{ fontSize: 11, color: "#3A3850", marginTop: 5 }}>
                Clique em "Adicionar no Vercel" para registrar o domínio. Depois configure o DNS abaixo.
              </div>
            </div>

            {/* DNS guide — aparece após adicionar ao Vercel */}
            {vercelDomain && (
              <div style={{ ...card, borderColor: "rgba(46,184,122,0.25)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#2EB87A", marginBottom: 10 }}>
                  {vercelDomain.verified ? "✓ Domínio verificado" : "⏳ Domínio adicionado — configure o DNS"}
                </div>
                <div style={{ fontSize: 10, color: "#8E8AA8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Registro DNS a criar no seu provedor
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: "4px 8px", fontFamily: "monospace", fontSize: 11 }}>
                  <span style={{ color: "#55526A" }}>TIPO</span>
                  <span style={{ color: "#55526A" }}>NOME</span>
                  <span style={{ color: "#55526A" }}>DESTINO</span>
                  <span style={{ color: "#A67CFF", fontWeight: 700 }}>CNAME</span>
                  <span style={{ color: "#F0EEF8" }}>{cnameName}</span>
                  <span style={{ color: "#F0EEF8" }}>{cnameValue}</span>
                </div>
                <div style={{ fontSize: 10, color: "#55526A", marginTop: 10, lineHeight: 1.5 }}>
                  Após criar o registro CNAME, aguarde até 48h para propagação do DNS.
                  O status pode ser verificado em <strong style={{ color: "#8E8AA8" }}>Vercel → Project → Domains</strong>.
                </div>
              </div>
            )}

            {/* Guia para domínio já configurado sem clicar no botão */}
            {!vercelDomain && domain.trim() && initial.domain === domain.trim() && (
              <div style={card}>
                <div style={{ fontSize: 10, color: "#8E8AA8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Domínio salvo — guia DNS
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: "4px 8px", fontFamily: "monospace", fontSize: 11 }}>
                  <span style={{ color: "#55526A" }}>TIPO</span>
                  <span style={{ color: "#55526A" }}>NOME</span>
                  <span style={{ color: "#55526A" }}>DESTINO</span>
                  <span style={{ color: "#A67CFF", fontWeight: 700 }}>CNAME</span>
                  <span style={{ color: "#F0EEF8" }}>{cnameName}</span>
                  <span style={{ color: "#F0EEF8" }}>cname.vercel-dns.com</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SUBDIRECTORY ─────────────────────────── */}
        {mode === "subdirectory" && (
          <>
            <div>
              <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em" }}>Caminho base (basePath)</label>
              <input
                type="text"
                value={basePath}
                onChange={(e) => setBasePath(e.target.value)}
                placeholder="ex: /pt-BR/diadosnamorados2026"
                style={{ ...fld }}
              />
              <div style={{ fontSize: 11, color: "#3A3850", marginTop: 5 }}>
                Deve começar com <code style={{ color: "#8E8AA8" }}>/</code>. Sem barra final.
              </div>
            </div>

            {basePath.trim().startsWith("/") && (
              <div style={card}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#F0A84A", marginBottom: 12 }}>📋 Guia de configuração CloudFront — para a Softo</div>

                <Step n={1} title="Criar Origin">
                  <Row label="Origin domain" value={vercelHost} />
                  <Row label="Protocol" value="HTTPS only" />
                  <Row label="TLS mínimo" value="TLSv1.2+" />
                </Step>

                <Step n={2} title="Cache Behavior">
                  <Row label="Path pattern" value={`${basePath.trim()}*`} />
                  <Row label="Origin" value="acima" />
                  <Row label="Compress objects" value="Sim" />
                  <Row label="Cache" value="CachingDisabled (TTL 0 durante campanha)" />
                </Step>

                <Step n={3} title="Origin Request Policy (criar customizada)">
                  <Row label="Headers" value={`Host → ${vercelHost}`} />
                  <Note>Sem isso a Vercel retorna 404 — é o passo mais crítico.</Note>
                </Step>

                <Step n={4} title="Verificar">
                  <div style={{ fontSize: 11, color: "#8E8AA8", lineHeight: 1.6 }}>
                    Acesse <strong style={{ color: "#F0EEF8" }}>{`seu-domínio.com.br${basePath.trim()}`}</strong> e confirme que a LP carrega.
                    O Default Behavior do CloudFront não é afetado.
                  </div>
                </Step>

                <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(166,124,255,0.07)", borderRadius: 6, fontSize: 10, color: "#8E8AA8", lineHeight: 1.5 }}>
                  <strong style={{ color: "#A67CFF" }}>Atenção:</strong> após configurar o CloudFront, o middleware deste app
                  reescreve automaticamente <code style={{ color: "#C4AEFF" }}>{basePath.trim()}*</code> para a rota interna — sem rebuild necessário.
                </div>
              </div>
            )}
          </>
        )}

        {/* Erro geral */}
        {error && <div style={{ fontSize: 11, color: "#E05260" }}>{error}</div>}

        {/* Botões */}
        <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 0", color: "#8E8AA8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || mode === null}
            style={{ flex: 2, background: mode ? "#A67CFF" : "#2A2838", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: saving || !mode ? "default" : "pointer", opacity: saving || !mode ? 0.6 : 1 }}
          >
            {saving ? "Salvando…" : "Salvar configuração"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers visuais ─────────────────────────────────── */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(166,124,255,0.2)", color: "#A67CFF", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#F0EEF8" }}>{title}</span>
      </div>
      <div style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{ fontSize: 10, color: "#55526A", minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, color: "#F0EEF8", fontFamily: "monospace" }}>{value}</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: "#E05260", marginTop: 2 }}>⚠ {children}</div>
  );
}
