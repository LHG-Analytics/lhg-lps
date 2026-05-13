import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminShell } from "./_components/AdminShell";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const [
    { data: brands },
    { data: campaigns },
    { count: totalCampaigns },
    { count: publishedCampaigns },
    { count: totalUsers },
    { data: activeCampaigns },
  ] = await Promise.all([
    supabase.from("brands").select("id, name, domain, logo, theme").order("name"),
    supabase
      .from("campaigns")
      .select("id, slug, brand_id, status, created_at, meta")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("campaigns").select("*", { count: "exact", head: true }),
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("admin_profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("campaigns")
      .select("id, slug, brand_id, meta")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
  ]);

  const brandNameMap = Object.fromEntries((brands ?? []).map((b) => [b.id, b.name]));

  return (
    <AdminShell userEmail={user.email!}>
      <header className="admin-header">
        <h1>Dashboard</h1>
        <Link href="/admin/campaigns/new" className="admin-btn-primary">
          + Nova campanha
        </Link>
      </header>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Marcas",     value: brands?.length ?? 0,     icon: "◈", color: "#A67CFF" },
          { label: "Campanhas",  value: totalCampaigns ?? 0,     icon: "◉", color: "#8E8AA8" },
          { label: "Publicadas", value: publishedCampaigns ?? 0, icon: "●", color: "#2EB87A" },
          { label: "Usuários",   value: totalUsers ?? 0,         icon: "◎", color: "#F0A84A" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6,
          }}>
            <span style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#F0EEF8", lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: 11, color: "#55526A", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* LPs publicadas */}
      {activeCampaigns && activeCampaigns.length > 0 && (
        <section className="admin-section" style={{ marginBottom: 32 }}>
          <h2 className="admin-section__title">LPs no ar agora</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {activeCampaigns.map((c) => {
              const meta = c.meta as { title?: string } | null;
              return (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(46,184,122,0.05)", border: "1px solid rgba(46,184,122,0.15)",
                  borderRadius: 8, padding: "10px 14px",
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2EB87A", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                    {meta?.title && (
                      <span style={{ fontSize: 13, color: "#F0EEF8", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {meta.title}
                      </span>
                    )}
                    <code style={{ fontSize: 10, color: "#55526A" }}>
                      {brandNameMap[c.brand_id] ?? c.brand_id} / {c.slug}
                    </code>
                  </div>
                  <Link
                    href={`/admin/preview/${c.brand_id}/${c.slug}` as Route}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "#2EB87A", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    Preview ↗
                  </Link>
                  <Link href={`/admin/campaigns/${c.id}`} className="admin-link" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                    Editar
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Brand cards */}
      <section className="admin-section">
        <h2 className="admin-section__title">Marcas ativas</h2>
        {brands && brands.length > 0 ? (
          <div className="brand-grid">
            {brands.map((b) => {
              const theme = b.theme as { bg?: string; lav?: string } | null;
              const logo  = b.logo  as { src?: string; alt?: string } | null;
              return (
                <Link
                  key={b.id}
                  href={`/admin/brands/${b.id}`}
                  className="brand-card"
                  style={{ "--brand-accent": theme?.lav, "--brand-bg": theme?.bg } as React.CSSProperties}
                >
                  <div className="brand-card__header">
                    {logo?.src && (
                      <Image
                        src={logo.src}
                        alt={logo.alt ?? b.name}
                        width={120}
                        height={32}
                        style={{ width: "auto", height: 28, objectFit: "contain" }}
                      />
                    )}
                  </div>
                  <div className="brand-card__body">
                    <p className="brand-card__name">{b.name}</p>
                    <p className="brand-card__domain">{b.domain ?? "—"}</p>
                  </div>
                  <div className="brand-card__footer">
                    <span className="brand-card__cta">Ver campanhas →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="admin-empty">Nenhuma marca cadastrada. <Link href="/admin/brands/new" className="admin-link">Criar primeira marca</Link></p>
        )}
      </section>

      {/* Recent campaigns */}
      <section className="admin-section">
        <h2 className="admin-section__title">Campanhas recentes</h2>
        {campaigns && campaigns.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Marca</th>
                <th>Status</th>
                <th>Criada em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const meta = c.meta as { title?: string } | null;
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {meta?.title
                          ? <span style={{ fontSize: 13, color: "#F0EEF8", fontWeight: 500 }}>{meta.title}</span>
                          : null}
                        <code style={{ fontSize: 11, color: "#55526A" }}>{c.slug}</code>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 12, color: "#8E8AA8" }}>{brandNameMap[c.brand_id] ?? c.brand_id}</span></td>
                    <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                    <td>{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                    <td>
                      <Link href={`/admin/campaigns/${c.id}`} className="admin-link">
                        Editar →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">Nenhuma campanha cadastrada ainda. Crie a primeira acima.</p>
        )}
      </section>
    </AdminShell>
  );
}
