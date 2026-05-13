"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const fld: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "8px 12px", color: "#F0EEF8", fontSize: 13,
  outline: "none", fontFamily: "inherit",
};

const lbl = (text: string, hint?: string) => (
  <div style={{ marginBottom: 6 }}>
    <label style={{ fontSize: 10, color: "#8E8AA8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{text}</label>
    {hint && <div style={{ fontSize: 10, color: "#3A3850", marginTop: 2 }}>{hint}</div>}
  </div>
);

export function BrandWizard() {
  const router = useRouter();
  const [name,   setName]   = useState("");
  const [id,     setId]     = useState("");
  const [domain, setDomain] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function derivedId(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
  }

  function onNameChange(val: string) {
    setName(val);
    if (!idTouched) setId(derivedId(val));
  }

  function onIdChange(val: string) {
    setId(derivedId(val));
    setIdTouched(true);
  }

  const idValid  = /^[a-z0-9-]+$/.test(id) && id.length >= 2;
  const canSubmit = name.trim().length >= 2 && idValid && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id.trim(), name: name.trim(), domain: domain.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(`/admin/brands/${id.trim()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar marca.");
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
      <main style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px", overflowY: "auto" }}>
        <form onSubmit={submit} style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Título */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F0EEF8", margin: "0 0 6px" }}>Nova marca</h1>
            <p style={{ fontSize: 13, color: "#55526A", margin: 0 }}>
              Crie uma marca para começar a configurar temas, unidades e campanhas.
            </p>
          </div>

          {/* Nome */}
          <div style={{ marginBottom: 20 }}>
            {lbl("Nome da marca", "Como será exibida no CMS e nas LPs.")}
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              style={fld}
              placeholder="Ex: Lush Motel"
              autoFocus
            />
          </div>

          {/* ID */}
          <div style={{ marginBottom: 20 }}>
            {lbl("ID (slug)", "Usado nas URLs e nos arquivos JSON. Não pode ser alterado depois.")}
            <div style={{ position: "relative" }}>
              <input
                value={id}
                onChange={(e) => onIdChange(e.target.value)}
                style={{
                  ...fld,
                  borderColor: id && !idValid ? "rgba(224,82,96,0.5)" : id && idValid ? "rgba(46,184,122,0.4)" : "rgba(255,255,255,0.08)",
                  fontFamily: "monospace",
                  paddingRight: 32,
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
          </div>

          {/* Domínio */}
          <div style={{ marginBottom: 32 }}>
            {lbl("Domínio", "Opcional. Apenas para exibição e links. Sem https://.")}
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              style={fld}
              placeholder="lushmotel.com.br"
            />
          </div>

          {error && (
            <div style={{ background: "rgba(224,82,96,0.1)", border: "1px solid rgba(224,82,96,0.25)", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: "#E05260", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/admin/brands" style={{
              flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.08)", color: "#8E8AA8",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                flex: 2, padding: "10px 0", borderRadius: 7, border: "none",
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
