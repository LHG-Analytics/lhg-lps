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

type CfStatus = "idle" | "ok" | "already" | "no_token" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  /** Domínio da marca dona da campanha — a URL pública se monta a partir dele. */
  brandDomain: string;
  initial: DeployConfig;
  onSaved: (cfg: DeployConfig) => void;
}

/** Domínios onde a regra wildcard `/campanhas/<*>` → Vercel já existe no
 * Amplify. Espelha o estado da infra, que é configurada por domínio pela Softo:
 * uma marca fora desta lista precisa da regra criada antes de publicar em
 * subdiretório, senão a URL responde 404 mesmo com tudo certo no CMS.
 * Ao habilitar um domínio novo, adicione-o aqui. */
const CAMPANHAS_WILDCARD_DOMAINS = ["lushmotel.com.br"];

const fld: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "7px 10px", color: "#F0EEF8", fontSize: 13,
  outline: "none", fontFamily: "monospace",
};

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 8, padding: 14,
};

export function DeployPanel({ open, onClose, campaignId, brandDomain, initial, onSaved }: Props) {
  const [mode, setMode]           = useState<DeployMode>(initial.mode);
  const [domain, setDomain]       = useState(initial.domain);
  const [basePath, setBasePath]   = useState(initial.basePath);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [configuring, setConfiguring]   = useState(false);
  const [vercelDomain, setVercelDomain] = useState<VercelDomain | null>(null);
  const [vercelError, setVercelError]   = useState("");
  const [cfStatus, setCfStatus]         = useState<CfStatus>("idle");
  const [cfError, setCfError]           = useState("");

  if (!open) return null;

  // Deriva o hostname do Vercel para o guia CloudFront
  const vercelHost = typeof window !== "undefined"
    ? window.location.hostname
    : "lhg-lps.vercel.app";

  const wildcardReady = CAMPANHAS_WILDCARD_DOMAINS.includes(brandDomain);
  const publicUrl     = `${brandDomain}${basePath.trim()}`;

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

  async function configure() {
    if (!domain.trim()) return;
    setConfiguring(true);
    setVercelError(""); setVercelDomain(null);
    setCfStatus("idle"); setCfError("");

    // 1. Adiciona domínio no Vercel
    let cnameTarget = "cname.vercel-dns.com";
    try {
      const res = await fetch("/api/admin/vercel/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) throw new Error(String((data as Record<string, unknown>).error ?? data) ?? "Erro Vercel");
      const cnames = Array.isArray(data.cnames) ? data.cnames as string[] : [];
      cnameTarget = cnames[0] ?? "cname.vercel-dns.com";
      setVercelDomain({
        name:     String(data.name ?? domain),
        verified: Boolean(data.verified),
        cnames:   [cnameTarget],
      });
    } catch (e) {
      setVercelError(e instanceof Error ? e.message : "Erro na API Vercel.");
      setConfiguring(false);
      return;
    }

    // 2. Cria CNAME no Cloudflare (falha graciosamente se sem token)
    try {
      const res = await fetch("/api/admin/cloudflare/dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), target: cnameTarget }),
      });
      if (res.status === 503) { setCfStatus("no_token"); }
      else if (!res.ok) { setCfError(await res.text()); setCfStatus("error"); }
      else {
        const data = await res.json() as { alreadyExists?: boolean };
        setCfStatus(data.alreadyExists ? "already" : "ok");
      }
    } catch {
      setCfStatus("error"); setCfError("Erro de rede ao contactar Cloudflare.");
    }

    setConfiguring(false);
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
                  onChange={(e) => { setDomain(e.target.value); setVercelDomain(null); setCfStatus("idle"); }}
                  placeholder="ex: namorados2026.lushmotel.com.br"
                  style={{ ...fld, flex: 1 }}
                />
                <button
                  onClick={configure}
                  disabled={configuring || !domain.trim()}
                  style={{
                    background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6,
                    padding: "0 14px", fontSize: 12, fontWeight: 700,
                    cursor: configuring || !domain.trim() ? "default" : "pointer",
                    opacity: configuring || !domain.trim() ? 0.5 : 1, whiteSpace: "nowrap",
                  }}
                >
                  {configuring ? "Configurando…" : "Configurar"}
                </button>
              </div>
              {vercelError && <div style={{ fontSize: 11, color: "#E05260", marginTop: 5 }}>⚠ Vercel: {vercelError}</div>}
              <div style={{ fontSize: 11, color: "#3A3850", marginTop: 5 }}>
                Registra o domínio no Vercel e cria o CNAME no Cloudflare automaticamente.
              </div>
            </div>

            {/* Resultado combinado Vercel + Cloudflare */}
            {vercelDomain && (
              <div style={{ ...card, borderColor: "rgba(46,184,122,0.25)", display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Status Vercel */}
                <StatusRow
                  icon="▲"
                  label="Vercel"
                  status={vercelDomain.verified ? "ok" : "pending"}
                  okText="Domínio verificado"
                  pendingText="Domínio registrado"
                />

                {/* Status Cloudflare */}
                {cfStatus === "ok"       && <StatusRow icon="☁" label="Cloudflare" status="ok"      okText="CNAME criado automaticamente" />}
                {cfStatus === "already"  && <StatusRow icon="☁" label="Cloudflare" status="ok"      okText="CNAME já existia — mantido" />}
                {cfStatus === "no_token" && <StatusRow icon="☁" label="Cloudflare" status="warn"    pendingText="Token não configurado — veja instruções abaixo" />}
                {cfStatus === "error"    && <StatusRow icon="☁" label="Cloudflare" status="error"   pendingText={cfError || "Erro ao criar CNAME"} />}

                {/* Instrução manual de DNS (só aparece se Cloudflare falhou ou sem token) */}
                {(cfStatus === "no_token" || cfStatus === "error") && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                    <div style={{ fontSize: 10, color: "#8E8AA8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      Crie este registro DNS manualmente
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: "4px 8px", fontFamily: "monospace", fontSize: 11 }}>
                      <span style={{ color: "#55526A" }}>TIPO</span><span style={{ color: "#55526A" }}>NOME</span><span style={{ color: "#55526A" }}>DESTINO</span>
                      <span style={{ color: "#A67CFF", fontWeight: 700 }}>CNAME</span>
                      <span style={{ color: "#F0EEF8" }}>{cnameName}</span>
                      <span style={{ color: "#F0EEF8" }}>{cnameValue}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#E05260", marginTop: 6 }}>
                      ⚠ Certifique-se de usar <strong>DNS only</strong> (nuvem cinza) no Cloudflare — proxy laranja quebra a verificação Vercel.
                    </div>
                  </div>
                )}

                {/* Tudo OK */}
                {(cfStatus === "ok" || cfStatus === "already") && (
                  <div style={{ fontSize: 11, color: "#55526A", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                    Aguarde até 2 minutos para propagação. Após salvar, a campanha já roteia para este domínio.
                  </div>
                )}
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
                placeholder="ex: /campanhas/natal"
                style={{ ...fld }}
              />
              <div style={{ fontSize: 11, color: "#3A3850", marginTop: 5 }}>
                Deve começar com <code style={{ color: "#8E8AA8" }}>/</code>. Sem barra final.
              </div>
            </div>

            {/* /campanhas/* — o wildcard do Amplify existe por domínio */}
            {basePath.trim().startsWith("/campanhas/") && (
              wildcardReady ? (
                <div style={{ ...card, borderColor: "rgba(46,184,122,0.25)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2EB87A" }}>✓ Pronto para publicar</div>
                  <div style={{ fontSize: 11, color: "#8E8AA8", lineHeight: 1.6 }}>
                    A regra <code style={{ color: "#C4AEFF" }}>/campanhas/{"<*>"}</code> já está configurada no Amplify
                    de <strong style={{ color: "#F0EEF8" }}>{brandDomain}</strong> e cobre qualquer slug futuro.
                    Nenhuma configuração adicional é necessária.
                  </div>
                  <div style={{ fontSize: 11, color: "#8E8AA8", lineHeight: 1.6 }}>
                    Após salvar e publicar, a URL <strong style={{ color: "#F0EEF8" }}>{publicUrl}</strong>{" "}
                    estará no ar em até 60 segundos.
                  </div>
                </div>
              ) : (
                <div style={{ ...card, borderColor: "rgba(240,168,74,0.3)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F0A84A" }}>⚠ Falta liberar o domínio</div>
                  <div style={{ fontSize: 11, color: "#8E8AA8", lineHeight: 1.6 }}>
                    O wildcard <code style={{ color: "#C4AEFF" }}>/campanhas/{"<*>"}</code> está configurado apenas em{" "}
                    <strong style={{ color: "#F0EEF8" }}>{CAMPANHAS_WILDCARD_DOMAINS.join(", ")}</strong>. Em{" "}
                    <strong style={{ color: "#F0EEF8" }}>{brandDomain}</strong> ele ainda não existe, então{" "}
                    <strong style={{ color: "#F0EEF8" }}>{publicUrl}</strong> vai responder 404 mesmo com a campanha publicada.
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                    <div style={{ fontSize: 10, color: "#8E8AA8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      Peça à Softo esta regra em {brandDomain}
                    </div>
                    <Row label="Tipo" value="Rewrite (200)" />
                    <Row label="Origem" value="/campanhas/<*>" />
                    <Row label="Destino" value={`https://${vercelHost}/campanhas/<*>`} />
                  </div>
                  <div style={{ fontSize: 10, color: "#55526A", lineHeight: 1.5 }}>
                    Regra criada uma única vez por domínio — depois dela, toda campanha nova em{" "}
                    <code style={{ color: "#8E8AA8" }}>/campanhas/…</code> funciona sem tocar na infra.
                    Alternativa sem depender da Softo: use o modo <strong>Subdomínio</strong>, que se configura sozinho.
                  </div>
                </div>
              )
            )}

            {/* Outros paths (/pt-BR/...) — guia CloudFront para a Softo */}
            {basePath.trim().startsWith("/") && !basePath.trim().startsWith("/campanhas/") && (
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
                    Acesse <strong style={{ color: "#F0EEF8" }}>{publicUrl}</strong> e confirme que a LP carrega.
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
function StatusRow({ icon, label, status, okText, pendingText }: {
  icon: string; label: string;
  status: "ok" | "pending" | "warn" | "error";
  okText?: string; pendingText?: string;
}) {
  const color = status === "ok" ? "#2EB87A" : status === "error" ? "#E05260" : status === "warn" ? "#F0A84A" : "#8E8AA8";
  const dot   = status === "ok" ? "✓" : status === "error" ? "✕" : "⏳";
  const text  = status === "ok" ? (okText ?? "") : (pendingText ?? "");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, width: 18, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 11, color: "#8E8AA8", minWidth: 70, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{dot} {text}</span>
    </div>
  );
}

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
