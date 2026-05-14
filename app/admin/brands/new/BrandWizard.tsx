"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/app/admin/_components/ImageUploadField";

const fld: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "8px 12px", color: "#F0EEF8", fontSize: 13,
  outline: "none", fontFamily: "inherit",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#3A3850", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <label style={{ fontSize: 10, color: "#8E8AA8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {label}{required && <span style={{ color: "#E05260", marginLeft: 3 }}>*</span>}
        </label>
        {hint && <div style={{ fontSize: 10, color: "#3A3850", marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function derivedId(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
}

export function BrandWizard() {
  const router = useRouter();

  // identidade
  const [name,       setName]       = useState("");
  const [id,         setId]         = useState("");
  const [idTouched,  setIdTouched]  = useState(false);
  const [domain,     setDomain]     = useState("");

  // assets
  const [favicon,  setFavicon]  = useState("");
  const [logoUrl,  setLogoUrl]  = useState("");

  // tema
  const [accentColor, setAccentColor] = useState("#A67CFF");

  // form
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function onNameChange(val: string) {
    setName(val);
    if (!idTouched) setId(derivedId(val));
  }
  function onIdChange(val: string) {
    setId(derivedId(val));
    setIdTouched(true);
  }

  const idValid  = /^[a-z0-9-]+$/.test(id) && id.length >= 2;
  const canSubmit = name.trim().length >= 2 && idValid && favicon.trim().length > 0 && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:     id.trim(),
          name:   name.trim(),
          domain: domain.trim() || undefined,
          favicon: favicon.trim(),
          logo:    logoUrl.trim() ? { url: logoUrl.trim() } : undefined,
          themeColor: accentColor,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(`/admin/brands/${id.trim()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar marca.");
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#0D0D12" }}>
      {/* Header */}
      <header style={{ height: 48, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
        <Image src="/brands/lhg/logos/logo-white.webp" alt="LHG" width={80} height={20} style={{ width: "auto", height: 20 }} />
        <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
        <Link href="/admin/brands" style={{ color: "#55526A", fontSize: 12, textDecoration: "none" }}>Marcas</Link>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
        <span style={{ fontSize: 13, color: "#F0EEF8" }}>Nova marca</span>
      </header>

      {/* Body */}
      <main style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px 60px", overflowY: "auto" }}>
        <form onSubmit={submit} style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 32 }}>

          {/* Título */}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F0EEF8", margin: "0 0 6px" }}>Nova marca</h1>
            <p style={{ fontSize: 13, color: "#55526A", margin: 0 }}>
              Preencha os campos essenciais. Tema completo, unidades e booking podem ser configurados depois.
            </p>
          </div>

          {/* ── IDENTIDADE ── */}
          <Section title="Identidade">
            <Field label="Nome da marca" hint="Como será exibida no CMS e nas LPs." required>
              <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                style={fld}
                placeholder="Ex: Lush Motel"
                autoFocus
              />
            </Field>

            <Field label="ID (slug)" hint="Usado nas URLs e arquivos JSON. Não pode ser alterado depois." required>
              <div style={{ position: "relative" }}>
                <input
                  value={id}
                  onChange={(e) => onIdChange(e.target.value)}
                  style={{
                    ...fld,
                    fontFamily: "monospace",
                    paddingRight: 32,
                    borderColor: id && !idValid ? "rgba(224,82,96,0.5)" : id && idValid ? "rgba(46,184,122,0.4)" : "rgba(255,255,255,0.08)",
                  }}
                  placeholder="lush"
                />
                {id && idValid && (
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#2EB87A", fontSize: 12 }}>✓</span>
                )}
              </div>
              {id && !idValid && (
                <div style={{ fontSize: 10, color: "#E05260", marginTop: 4 }}>Apenas letras minúsculas, números e hífens. Mínimo 2 caracteres.</div>
              )}
              {id && idValid && (
                <div style={{ fontSize: 10, color: "#3A3850", marginTop: 4 }}>
                  Rota: <span style={{ color: "#55526A", fontFamily: "monospace" }}>/admin/brands/{id}</span>
                </div>
              )}
            </Field>

            <Field label="Domínio" hint="Opcional. Para exibição e links canônicos. Sem https://.">
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                style={fld}
                placeholder="lushmotel.com.br"
              />
            </Field>
          </Section>

          {/* ── ASSETS VISUAIS ── */}
          <Section title="Assets visuais">
            <Field
              label="Favicon"
              hint="Ícone da aba do navegador. Recomendado: 64×64 px, formato .png ou .ico."
              required
            >
              <ImageUploadField
                value={favicon}
                brandId={id || "new"}
                onChange={setFavicon}
                compact={false}
              />
              {!favicon && (
                <div style={{ fontSize: 10, color: "#3A3850", marginTop: 4 }}>
                  Obrigatório para criar a marca.
                </div>
              )}
            </Field>

            <Field label="Logo" hint="Logo principal usada no header do CMS e nas LPs. Recomendado: fundo transparente (.webp ou .png).">
              <ImageUploadField
                value={logoUrl}
                brandId={id || "new"}
                onChange={setLogoUrl}
                compact={false}
              />
            </Field>
          </Section>

          {/* ── TEMA INICIAL ── */}
          <Section title="Cor principal">
            <Field label="Cor de destaque" hint="Usada em botões, hover e elementos de UI. Pode ser ajustada depois no editor de tema.">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{ width: 40, height: 36, padding: 2, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, cursor: "pointer", background: "none", flexShrink: 0 }}
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && setAccentColor(e.target.value)}
                  style={{ ...fld, fontFamily: "monospace", flex: 1 }}
                  placeholder="#A67CFF"
                  maxLength={7}
                />
              </div>
            </Field>
          </Section>

          {/* Erro */}
          {error && (
            <div style={{ background: "rgba(224,82,96,0.08)", border: "1px solid rgba(224,82,96,0.25)", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: "#E05260" }}>
              {error}
            </div>
          )}

          {/* Ações */}
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/admin/brands" style={{
              flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.08)", color: "#8E8AA8",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              title={!favicon ? "Favicon obrigatório" : !idValid ? "ID inválido" : ""}
              style={{
                flex: 2, padding: "11px 0", borderRadius: 7, border: "none",
                background: canSubmit ? "#A67CFF" : "#2A2445",
                color: canSubmit ? "#fff" : "#4A4668",
                fontSize: 13, fontWeight: 700,
                cursor: canSubmit ? "pointer" : "default",
                transition: "background 0.15s",
              }}
            >
              {saving ? "Criando…" : "Criar marca →"}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
