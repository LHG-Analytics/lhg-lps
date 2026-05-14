"use client";
import { ImageUploadField } from "@/app/admin/_components/ImageUploadField";

/* ── tipos ──────────────────────────────────────────── */
type Analytics = { ga4?: string; metaPixel?: string; gtm?: string; tiktokPixel?: string };

export type SeoMeta = {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  robots?: "index" | "noindex";
  analytics?: Analytics;
};

interface Props {
  meta: SeoMeta;
  slug: string;
  brandId: string;
  onChange: (meta: SeoMeta) => void;
  onSave: () => void;
  saving: boolean;
}

/* ── estilos compartilhados ─────────────────────────── */
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
  return <div style={{ fontSize: 10, color: "#3A3850", marginTop: 3, lineHeight: 1.4 }}>{children}</div>;
}
function CharCount({ value, max }: { value?: string; max: number }) {
  const len = value?.length ?? 0;
  const color = len > max ? "#E05260" : len >= max * 0.85 ? "#F0A84A" : "#3A3850";
  return <div style={{ fontSize: 10, color, marginTop: 3, textAlign: "right" as const }}>{len}/{max}</div>;
}

/* ── SERP Preview ───────────────────────────────────── */
function SerpPreview({ title, description, slug, brandId }: {
  title?: string; description?: string; slug: string; brandId: string;
}) {
  const rawTitle   = title || "Título da página";
  const rawDesc    = description || "Descrição da página para os mecanismos de busca.";
  const displayTitle = rawTitle.length > 60 ? rawTitle.slice(0, 57) + "…" : rawTitle;
  const breadcrumb = `${brandId}.com.br › pt-BR › ${slug}`;

  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", fontFamily: "Arial, sans-serif", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }}>
      {/* breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#4285F4,#34A853)", flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, color: "#202124", lineHeight: 1 }}>{breadcrumb.split(" › ")[0]}</div>
          <div style={{ fontSize: 11, color: "#4d5156" }}>{breadcrumb}</div>
        </div>
      </div>
      {/* title */}
      <div style={{ fontSize: 19, color: "#1a0dab", fontWeight: 400, lineHeight: 1.25, marginBottom: 4, wordBreak: "break-word" as const }}>
        {displayTitle}
      </div>
      {/* description */}
      <div style={{ fontSize: 13, color: "#4d5156", lineHeight: 1.45 }}>
        {rawDesc.length > 155 ? rawDesc.slice(0, 152) + "…" : rawDesc}
      </div>
    </div>
  );
}

/* ── WhatsApp / OG Preview ──────────────────────────── */
function SocialPreview({ title, description, ogImage, brandId }: {
  title?: string; description?: string; ogImage?: string; brandId: string;
}) {
  const displayTitle = (title || "Título da campanha").slice(0, 65);
  const displayDesc  = (description || "Descrição da campanha").slice(0, 100);
  const domain       = `${brandId}.com.br`.toUpperCase();

  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "#1B2836", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* imagem */}
      {ogImage ? (
        <img src={ogImage} alt="" style={{ width: "100%", aspectRatio: "1200/630", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{
          width: "100%", aspectRatio: "1200/630", background: "linear-gradient(135deg,#111820 0%,#1B2836 100%)",
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>1200 × 630 px recomendado</span>
        </div>
      )}
      {/* texto */}
      <div style={{ padding: "10px 14px 12px" }}>
        <div style={{ fontSize: 10, color: "#4FC3F7", letterSpacing: "0.05em", marginBottom: 3, fontWeight: 600 }}>{domain}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#F0EEF8", lineHeight: 1.3, marginBottom: 3 }}>
          {displayTitle}{title && title.length > 65 ? "…" : ""}
        </div>
        <div style={{ fontSize: 12, color: "#8E9EAA", lineHeight: 1.4 }}>
          {displayDesc}{description && description.length > 100 ? "…" : ""}
        </div>
      </div>
    </div>
  );
}

/* ── SeoPanel ───────────────────────────────────────── */
export function SeoPanel({ meta, slug, brandId, onChange, onSave, saving }: Props) {
  const up = (patch: Partial<SeoMeta>) => onChange({ ...meta, ...patch });
  const upAnalytics = (key: keyof Analytics, val: string) =>
    onChange({ ...meta, analytics: { ...meta.analytics, [key]: val || undefined } });

  const effectiveOgTitle = meta.ogTitle || meta.title;
  const effectiveOgDesc  = meta.ogDescription || meta.description;
  const robotsValue      = meta.robots ?? "index";

  return (
    <div style={{ flex: 1, overflowY: "auto" as const, padding: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── SERP PREVIEW ── */}
        <div>
          <SectionTitle>Prévia no Google</SectionTitle>
          <SerpPreview title={meta.title} description={meta.description} slug={slug} brandId={brandId} />
        </div>

        <Divider />

        {/* ── BÁSICO ── */}
        <div>
          <SectionTitle>Básico</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <FieldLabel>Título da página &lt;title&gt;</FieldLabel>
              <input
                type="text"
                value={meta.title ?? ""}
                onChange={(e) => up({ title: e.target.value })}
                style={fieldStyle}
                placeholder="Ex: Dia dos Namorados 2026 · Lush Motel"
              />
              <CharCount value={meta.title} max={60} />
            </div>
            <div>
              <FieldLabel>Meta descrição</FieldLabel>
              <textarea
                value={meta.description ?? ""}
                onChange={(e) => up({ description: e.target.value })}
                style={{ ...fieldStyle, resize: "vertical" as const }}
                rows={3}
                placeholder="Resumo que aparece no Google, máximo 160 caracteres"
              />
              <CharCount value={meta.description} max={160} />
            </div>
          </div>
        </div>

        <Divider />

        {/* ── OPEN GRAPH ── */}
        <div>
          <SectionTitle>Open Graph · WhatsApp / redes sociais</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <FieldLabel>Título para compartilhamento (og:title)</FieldLabel>
              <input
                type="text"
                value={meta.ogTitle ?? ""}
                onChange={(e) => up({ ogTitle: e.target.value || undefined })}
                style={fieldStyle}
                placeholder={`Herda: "${(meta.title ?? "").slice(0, 45) || "título acima"}"`}
              />
              <Hint>Deixe vazio para usar o título acima. Use quando quiser um texto diferente para redes sociais.</Hint>
            </div>
            <div>
              <FieldLabel>Descrição para compartilhamento (og:description)</FieldLabel>
              <textarea
                value={meta.ogDescription ?? ""}
                onChange={(e) => up({ ogDescription: e.target.value || undefined })}
                style={{ ...fieldStyle, resize: "vertical" as const }}
                rows={2}
                placeholder={`Herda: "${(meta.description ?? "").slice(0, 50) || "descrição acima"}…"`}
              />
              <Hint>Deixe vazio para usar a descrição acima.</Hint>
            </div>
            <div>
              <FieldLabel>Imagem de compartilhamento (og:image) — 1200 × 630 px</FieldLabel>
              <ImageUploadField
                value={meta.ogImage ?? ""}
                brandId={brandId}
                onChange={(url) => up({ ogImage: url || undefined })}
                compact
              />
              <Hint>Esta imagem aparece quando alguém compartilha a LP no WhatsApp, Instagram, ou iMessage.</Hint>
            </div>

            {/* WhatsApp Preview */}
            <div>
              <div style={{ fontSize: 10, color: "#55526A", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6 }}>Prévia · WhatsApp / iMessage</div>
              <SocialPreview title={effectiveOgTitle} description={effectiveOgDesc} ogImage={meta.ogImage} brandId={brandId} />
            </div>
          </div>
        </div>

        <Divider />

        {/* ── TÉCNICO ── */}
        <div>
          <SectionTitle>Técnico · Indexação e Canonical</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Robots */}
            <div>
              <FieldLabel>Indexação (robots)</FieldLabel>
              <div style={{ display: "flex", gap: 6 }}>
                {(["index", "noindex"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => up({ robots: opt })}
                    style={{
                      flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${robotsValue === opt ? "#A67CFF" : "rgba(255,255,255,0.08)"}`,
                      background: robotsValue === opt ? "rgba(166,124,255,0.18)" : "transparent",
                      color: robotsValue === opt ? "#A67CFF" : "#55526A",
                      transition: "all 0.15s",
                    }}
                  >
                    {opt === "index" ? "✓  Indexar" : "✗  Não indexar"}
                  </button>
                ))}
              </div>
              <Hint>
                {robotsValue === "noindex"
                  ? "⚠ A página não aparecerá no Google. Use apenas para campanhas em teste ou ocultas."
                  : "A página pode ser indexada pelo Google (padrão para LPs em produção)."}
              </Hint>
            </div>

            {/* Canonical */}
            <div>
              <FieldLabel>URL Canônica (rel=canonical)</FieldLabel>
              <input
                type="url"
                value={meta.canonical ?? ""}
                onChange={(e) => up({ canonical: e.target.value || undefined })}
                style={{ ...fieldStyle, fontFamily: "monospace", fontSize: 12 }}
                placeholder="https://lushmotel.com.br/pt-BR/diadosnamorados2026"
              />
              <Hint>
                Indica ao Google a URL "oficial" desta LP. Importante quando a mesma página é acessada por múltiplas URLs (ex: CloudFront + Vercel). Deixe vazio se não aplicável.
              </Hint>
            </div>
          </div>
        </div>

        <Divider />

        {/* ── ANALYTICS ── */}
        <div>
          <SectionTitle>Analytics & Pixels</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(
              [
                { key: "ga4"         as const, label: "Google Analytics 4",    placeholder: "G-XXXXXXXXXX",        icon: "G" },
                { key: "gtm"         as const, label: "Google Tag Manager",     placeholder: "GTM-XXXXXXX",         icon: "T" },
                { key: "metaPixel"   as const, label: "Meta Pixel (Facebook)",  placeholder: "1234567890",          icon: "f" },
                { key: "tiktokPixel" as const, label: "TikTok Pixel",           placeholder: "CXXXXXXXXXXXXXXXX",   icon: "♪" },
              ]
            ).map(({ key, label, placeholder, icon }) => (
              <div key={key}>
                <FieldLabel>{label}</FieldLabel>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 11, color: "#55526A", flexShrink: 0,
                  }}>{icon}</span>
                  <input
                    type="text"
                    value={meta.analytics?.[key] ?? ""}
                    onChange={(e) => upAnalytics(key, e.target.value)}
                    style={{ ...fieldStyle, fontSize: 12, fontFamily: "monospace", padding: "6px 10px" }}
                    placeholder={placeholder}
                  />
                </div>
              </div>
            ))}
            <Hint>Deixe em branco para herdar as configurações globais do projeto.</Hint>
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
          {saving ? "Salvando…" : "Salvar SEO & Analytics"}
        </button>

      </div>
    </div>
  );
}
