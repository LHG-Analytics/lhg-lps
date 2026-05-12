"use client";
import { useState } from "react";
import { ThemePanel, type Theme } from "@/app/admin/campaigns/[id]/ThemePanel";

/* ── tipos ─────────────────────────────────────────── */
interface Category {
  id: string;
  name: string;
  meta: string;
  slug: string;
  amenities: string[];
  hero?: boolean;
}

interface UnitCategories {
  all: Category[];
  "3h"?: Category[];
}

interface Unit {
  id: string;
  brand_id: string;
  label: string;
  name: string;
  address?: string;
  image?: string;
  booking_base_url?: string;
  categories?: UnitCategories;
}

interface Brand {
  id: string;
  name: string;
  domain?: string;
  favicon?: string;
  logo?: { src?: string; alt?: string };
  fonts?: Record<string, string>;
  theme?: Record<string, string>;
  booking?: { urlTemplate?: string };
  concierge?: { label?: string; href?: string };
  units?: Unit[];
}

type Tab = "identity" | "theme" | "booking" | "units";

const fld: React.CSSProperties = {
  width: "100%", background: "#16161F", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6, padding: "7px 10px", color: "#F0EEF8", fontSize: 13,
  outline: "none", fontFamily: "inherit", resize: "none",
};

const label = (text: string) => (
  <label style={{ fontSize: 10, color: "#8E8AA8", display: "block", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>
    {text}
  </label>
);

const section = (title: string) => (
  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#55526A", marginBottom: 10, marginTop: 4 }}>
    {title}
  </div>
);

/* ═══════════════════════════════════════════════════ */
export function BrandEditor({ initial }: { initial: Brand }) {
  const [tab, setTab]           = useState<Tab>("identity");
  const [brand, setBrand]       = useState<Brand>(initial);
  const [saving, setSaving]     = useState<Tab | null>(null);
  const [saved,  setSaved]      = useState<Tab | null>(null);
  const [error,  setError]      = useState("");

  async function save(fields: Partial<Brand>, which: Tab) {
    setSaving(which); setError("");
    try {
      const res = await fetch(`/api/admin/brands/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error(await res.text());
      setBrand((b) => ({ ...b, ...fields }));
      setSaved(which);
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(null);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "identity", label: "Identidade" },
    { id: "theme",    label: "🎨 Tema" },
    { id: "booking",  label: "Reserva" },
    { id: "units",    label: "Unidades" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#0D0D12", overflow: "hidden" }}>

      {/* Header */}
      <header style={{ height: 48, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
        <a href="/admin/brands" style={{ color: "#55526A", fontSize: 12, textDecoration: "none" }}>← Marcas</a>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
        <span style={{ fontSize: 13, color: "#F0EEF8", fontWeight: 700 }}>{brand.name}</span>
        <span style={{ fontSize: 11, color: "#55526A", fontFamily: "monospace" }}>{brand.id}</span>
        {brand.domain && (
          <a href={`https://${brand.domain}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: "#55526A", textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#A67CFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#55526A"; }}
          >↗ {brand.domain}</a>
        )}
        <div style={{ flex: 1 }} />
        {error && <span style={{ fontSize: 11, color: "#E05260" }}>{error}</span>}
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Tabs sidebar */}
        <aside style={{ width: 160, borderRight: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, padding: "12px 8px" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", borderRadius: 6, border: "none", cursor: "pointer", marginBottom: 3,
                background: tab === t.id ? "rgba(166,124,255,0.15)" : "transparent",
                color: tab === t.id ? "#A67CFF" : "#8E8AA8",
                fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: 28 }}>

          {/* ── IDENTIDADE ──────────────────────────── */}
          {tab === "identity" && (
            <IdentityTab brand={brand} saving={saving === "identity"} saved={saved === "identity"}
              onSave={(fields) => save(fields, "identity")} />
          )}

          {/* ── TEMA ────────────────────────────────── */}
          {tab === "theme" && (
            <div style={{ maxWidth: 420 }}>
              {section("Paleta de cores")}
              <ThemePanel
                theme={(brand.theme ?? {}) as Theme}
                onChange={(t) => setBrand((b) => ({ ...b, theme: t }))}
                saving={saving === "theme"}
                onSave={() => save({ theme: brand.theme }, "theme")}
              />
              {saved === "theme" && <div style={{ fontSize: 11, color: "#2EB87A", marginTop: 8 }}>✓ Tema salvo</div>}
            </div>
          )}

          {/* ── RESERVA ─────────────────────────────── */}
          {tab === "booking" && (
            <BookingTab brand={brand} saving={saving === "booking"} saved={saved === "booking"}
              onSave={(fields) => save(fields, "booking")} />
          )}

          {/* ── UNIDADES ────────────────────────────── */}
          {tab === "units" && (
            <UnitsTab units={brand.units ?? []} brandId={brand.id} />
          )}

        </main>
      </div>
    </div>
  );
}

/* ── Identidade ─────────────────────────────────────── */
function IdentityTab({ brand, saving, saved, onSave }: {
  brand: Brand;
  saving: boolean;
  saved: boolean;
  onSave: (fields: Partial<Brand>) => void;
}) {
  const [name,    setName]    = useState(brand.name ?? "");
  const [domain,  setDomain]  = useState(brand.domain ?? "");
  const [favicon, setFavicon] = useState(brand.favicon ?? "");
  const [logoSrc, setLogoSrc] = useState(brand.logo?.src ?? "");
  const [logoAlt, setLogoAlt] = useState(brand.logo?.alt ?? "");

  function submit() {
    onSave({
      name:    name.trim(),
      domain:  domain.trim() || undefined,
      favicon: favicon.trim() || undefined,
      logo:    { src: logoSrc.trim(), alt: logoAlt.trim() },
    });
  }

  return (
    <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
      {section("Dados da marca")}

      <div>
        {label("Nome")}
        <input value={name} onChange={(e) => setName(e.target.value)} style={fld} placeholder="Ex: Lush Motel" />
      </div>

      <div>
        {label("Domínio")}
        <input value={domain} onChange={(e) => setDomain(e.target.value)} style={fld} placeholder="lushmotel.com.br" />
        <div style={{ fontSize: 10, color: "#3A3850", marginTop: 3 }}>Apenas para exibição e links. Sem https://.</div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
        {section("Logotipo")}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {logoSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt={logoAlt} style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              {label("Caminho do arquivo (logo)")}
              <input value={logoSrc} onChange={(e) => setLogoSrc(e.target.value)} style={fld} placeholder="/brands/lush/logo.png" />
            </div>
            <div>
              {label("Texto alternativo")}
              <input value={logoAlt} onChange={(e) => setLogoAlt(e.target.value)} style={fld} placeholder="Lush Motel" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
        {section("Favicon")}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon} alt="favicon" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", flexShrink: 0 }} />
          )}
          <input value={favicon} onChange={(e) => setFavicon(e.target.value)} style={{ ...fld, flex: 1 }} placeholder="/brands/lush/favicon.png" />
        </div>
      </div>

      <SaveRow saving={saving} saved={saved} onSave={submit} />
    </div>
  );
}

/* ── Reserva ────────────────────────────────────────── */
function BookingTab({ brand, saving, saved, onSave }: {
  brand: Brand;
  saving: boolean;
  saved: boolean;
  onSave: (fields: Partial<Brand>) => void;
}) {
  const [urlTemplate,      setUrlTemplate]      = useState(brand.booking?.urlTemplate ?? "");
  const [conciergeLabel,   setConciergeLabel]   = useState(brand.concierge?.label ?? "");
  const [conciergeHref,    setConciergeHref]    = useState(brand.concierge?.href ?? "");

  function submit() {
    onSave({
      booking:   { urlTemplate: urlTemplate.trim() },
      concierge: conciergeHref.trim()
        ? { label: conciergeLabel.trim(), href: conciergeHref.trim() }
        : undefined,
    });
  }

  return (
    <div style={{ maxWidth: 580, display: "flex", flexDirection: "column", gap: 16 }}>
      {section("Template de URL de reserva")}

      <div>
        {label("URL Template")}
        <textarea
          value={urlTemplate}
          onChange={(e) => setUrlTemplate(e.target.value)}
          style={{ ...fld, fontFamily: "monospace", fontSize: 12 }}
          rows={3}
          placeholder="https://lushmotel.com.br/pt-BR/{unit}/{categorySlug}/schedule?date={date}&period={period}"
        />
        <div style={{ fontSize: 10, color: "#3A3850", marginTop: 4, lineHeight: 1.6 }}>
          Placeholders disponíveis: <code style={{ color: "#A67CFF" }}>{"{unit}"}</code> <code style={{ color: "#A67CFF" }}>{"{categorySlug}"}</code> <code style={{ color: "#A67CFF" }}>{"{date}"}</code> <code style={{ color: "#A67CFF" }}>{"{period}"}</code>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
        {section("Botão de concierge / WhatsApp")}
        <div style={{ fontSize: 10, color: "#55526A", marginBottom: 12, lineHeight: 1.6 }}>
          Aparece como FAB fixo no canto da LP. Deixe o href em branco para desativar.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            {label("Rótulo")}
            <input value={conciergeLabel} onChange={(e) => setConciergeLabel(e.target.value)} style={fld} placeholder="Fale conosco" />
          </div>
          <div>
            {label("Link (href)")}
            <input value={conciergeHref} onChange={(e) => setConciergeHref(e.target.value)} style={{ ...fld, fontFamily: "monospace" }} placeholder="https://wa.me/55119..." />
          </div>
        </div>
      </div>

      <SaveRow saving={saving} saved={saved} onSave={submit} />
    </div>
  );
}

/* ── Unidades ────────────────────────────────────────── */
function UnitsTab({ units, brandId }: { units: Unit[]; brandId: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error,  setError]      = useState("");
  const [unitData, setUnitData] = useState<Record<string, Unit>>(
    Object.fromEntries(units.map((u) => [u.id, { ...u }]))
  );

  const unit = selected ? unitData[selected] : null;

  function update(field: keyof Unit, val: unknown) {
    if (!selected) return;
    setUnitData((d) => ({ ...d, [selected]: { ...d[selected]!, [field]: val } }));
  }

  async function saveUnit() {
    if (!selected || !unit) return;
    setSaving(true); setError("");
    try {
      const { id, brand_id: _bid, categories: _cat, ...fields } = unit;
      const res = await fetch(`/api/admin/brands/${brandId}/units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  if (units.length === 0) {
    return (
      <div style={{ color: "#55526A", fontSize: 13 }}>
        Nenhuma unidade cadastrada para esta marca.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>
      {/* Lista */}
      <div style={{ width: 200, flexShrink: 0 }}>
        {section("Unidades")}
        {units.map((u) => (
          <div
            key={u.id}
            onClick={() => setSelected(u.id)}
            style={{
              padding: "10px 12px", borderRadius: 7, cursor: "pointer", marginBottom: 4,
              background: selected === u.id ? "rgba(166,124,255,0.12)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${selected === u.id ? "rgba(166,124,255,0.35)" : "rgba(255,255,255,0.06)"}`,
            }}
            onMouseEnter={(e) => { if (selected !== u.id) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={(e) => { if (selected !== u.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: selected === u.id ? "#C4AEFF" : "#F0EEF8" }}>{u.name}</div>
            <div style={{ fontSize: 10, color: "#55526A", marginTop: 2, fontFamily: "monospace" }}>{u.id}</div>
          </div>
        ))}
      </div>

      {/* Editor da unidade */}
      {unit && (
        <div style={{ flex: 1, maxWidth: 500, display: "flex", flexDirection: "column", gap: 14 }}>
          {section(`Editar: ${unit.name}`)}
          <div>
            {label("Nome")}
            <input value={unit.name ?? ""} onChange={(e) => update("name", e.target.value)} style={fld} />
          </div>
          <div>
            {label("Rótulo (exibido na LP)")}
            <input value={unit.label ?? ""} onChange={(e) => update("label", e.target.value)} style={fld} placeholder="Ex: Lapa" />
          </div>
          <div>
            {label("Endereço")}
            <input value={unit.address ?? ""} onChange={(e) => update("address", e.target.value)} style={fld} />
          </div>
          <div>
            {label("URL base de reserva")}
            <input value={unit.booking_base_url ?? ""} onChange={(e) => update("booking_base_url", e.target.value)} style={{ ...fld, fontFamily: "monospace", fontSize: 12 }} placeholder="https://lushmotel.com.br/pt-BR/lapa" />
          </div>
          <div>
            {label("Imagem")}
            <input value={unit.image ?? ""} onChange={(e) => update("image", e.target.value)} style={{ ...fld, fontFamily: "monospace", fontSize: 12 }} placeholder="/brands/lush/units/lapa.jpg" />
          </div>

          <CategoriesEditor unit={unit} brandId={brandId} />

          {error && <div style={{ fontSize: 11, color: "#E05260" }}>{error}</div>}
          <SaveRow saving={saving} saved={false} onSave={saveUnit} label="Salvar unidade" />
        </div>
      )}
    </div>
  );
}

/* ── CategoriesEditor ───────────────────────────────── */
const CAT_FLD: React.CSSProperties = {
  background: "#16161F", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 5, padding: "4px 8px", color: "#F0EEF8", fontSize: 11,
  outline: "none", fontFamily: "inherit", width: "100%",
};

function blankCategory(): Category {
  return { id: "", name: "", meta: "", slug: "", amenities: [], hero: false };
}

function CatRow({ cat, onChange, onRemove }: {
  cat: Category;
  onChange: (c: Category) => void;
  onRemove: () => void;
}) {
  function set<K extends keyof Category>(k: K, v: Category[K]) { onChange({ ...cat, [k]: v }); }

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, padding: 10, display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 28px", gap: 6, alignItems: "end" }}>
        <div>
          <div style={{ fontSize: 8, color: "#55526A", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Nome</div>
          <input value={cat.name} onChange={(e) => set("name", e.target.value)} style={CAT_FLD} placeholder="Suite Lush" />
        </div>
        <div>
          <div style={{ fontSize: 8, color: "#55526A", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Slug (URL)</div>
          <input value={cat.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} style={{ ...CAT_FLD, fontFamily: "monospace" }} placeholder="lush" />
        </div>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#E05260", cursor: "pointer", fontSize: 12, alignSelf: "flex-end", paddingBottom: 4 }}>✕</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div>
          <div style={{ fontSize: 8, color: "#55526A", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>ID (único)</div>
          <input value={cat.id} onChange={(e) => set("id", e.target.value.toLowerCase().replace(/\s+/g, "-"))} style={{ ...CAT_FLD, fontFamily: "monospace" }} placeholder="lush" />
        </div>
        <div>
          <div style={{ fontSize: 8, color: "#55526A", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Meta (tagline)</div>
          <input value={cat.meta} onChange={(e) => set("meta", e.target.value)} style={CAT_FLD} placeholder="Suíte padrão" />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 8, color: "#55526A", marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Amenidades (separadas por vírgula)</div>
        <input
          value={cat.amenities.join(", ")}
          onChange={(e) => set("amenities", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          style={CAT_FLD}
          placeholder="TV, Wi-Fi, Banheira"
        />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: "#8E8AA8" }}>
        <input type="checkbox" checked={cat.hero ?? false} onChange={(e) => set("hero", e.target.checked)} style={{ accentColor: "#A67CFF" }} />
        Destaque (hero) na LP
      </label>
    </div>
  );
}

function CategoriesEditor({ unit, brandId }: { unit: Unit; brandId: string }) {
  const initial = unit.categories ?? { all: [] };
  const [allCats, setAllCats]     = useState<Category[]>(initial.all);
  const [cats3h,  setCats3h]      = useState<Category[]>(initial["3h"] ?? []);
  const [show3h,  setShow3h]      = useState((initial["3h"] ?? []).length > 0);
  const [saving,  setSaving]      = useState(false);
  const [error,   setError]       = useState("");
  const [saved,   setSaved]       = useState(false);

  async function save() {
    setSaving(true); setError("");
    const categories: UnitCategories = { all: allCats, ...(show3h ? { "3h": cats3h } : {}) };
    try {
      const res = await fetch(`/api/admin/brands/${brandId}/units/${unit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  }

  function addAll()  { setAllCats((c) => [...c, blankCategory()]); }
  function add3h()   { setCats3h((c) => [...c, blankCategory()]); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
      {/* Catálogo "all" */}
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#55526A", marginBottom: 8 }}>
          Categorias — all (catálogo completo)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {allCats.map((c, i) => (
            <CatRow key={i} cat={c}
              onChange={(nc) => setAllCats((prev) => prev.map((x, j) => j === i ? nc : x))}
              onRemove={() => setAllCats((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
          <button onClick={addAll} style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 0", color: "#55526A", cursor: "pointer", fontSize: 11, textAlign: "center" }}>
            + Adicionar categoria
          </button>
        </div>
      </div>

      {/* Catálogo "3h" opcional */}
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, color: "#8E8AA8", marginBottom: show3h ? 8 : 0 }}>
          <input type="checkbox" checked={show3h} onChange={(e) => setShow3h(e.target.checked)} style={{ accentColor: "#A67CFF" }} />
          Restringir categorias disponíveis para períodos de 3h
        </label>
        {show3h && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, color: "#55526A", lineHeight: 1.5 }}>
              Se vazio, todos os períodos 3h verão o catálogo completo (all).
            </div>
            {cats3h.map((c, i) => (
              <CatRow key={i} cat={c}
                onChange={(nc) => setCats3h((prev) => prev.map((x, j) => j === i ? nc : x))}
                onRemove={() => setCats3h((prev) => prev.filter((_, j) => j !== i))}
              />
            ))}
            <button onClick={add3h} style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 0", color: "#55526A", cursor: "pointer", fontSize: 11, textAlign: "center" }}>
              + Adicionar categoria 3h
            </button>
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: 11, color: "#E05260" }}>{error}</div>}
      <SaveRow saving={saving} saved={saved} onSave={save} label="Salvar categorias" />
    </div>
  );
}

/* ── SaveRow ─────────────────────────────────────────── */
function SaveRow({ saving, saved, onSave, label: lbl }: {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6 }}>
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          background: "#A67CFF", color: "#fff", border: "none", borderRadius: 6,
          padding: "9px 22px", fontSize: 13, fontWeight: 700,
          cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Salvando…" : (lbl ?? "Salvar")}
      </button>
      {saved && <span style={{ fontSize: 11, color: "#2EB87A" }}>✓ Salvo</span>}
    </div>
  );
}
