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
      </header>

      {/* Bento stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 1fr",
        gridTemplateRows: "auto auto",
        gap: 10,
        marginBottom: 32,
      }}>
        {/* Featured: Publicadas */}
        {(() => {
          const total = totalCampaigns ?? 0;
          const pub   = publishedCampaigns ?? 0;
          const pct   = total > 0 ? Math.round((pub / total) * 100) : 0;
          return (
            <div style={{
              gridRow: "1 / 3",
              background: "linear-gradient(135deg, rgba(46,184,122,0.07) 0%, rgba(22,22,31,0.9) 60%)",
              border: "1px solid rgba(46,184,122,0.18)",
              borderRadius: 12, padding: "22px 24px",
              display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden",
            }}>
              {/* glow */}
              <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, rgba(46,184,122,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#2EB87A" }}>● Publicadas</span>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#F0EEF8", lineHeight: 1, letterSpacing: "-0.03em" }}>
                {pub}
              </span>
              <span style={{ fontSize: 12, color: "#55526A" }}>{total} campanhas no total</span>
              {/* progress bar */}
              <div style={{ marginTop: "auto", paddingTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: "#55526A" }}>Taxa de publicação</span>
                  <span style={{ fontSize: 10, color: "#2EB87A", fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: "linear-gradient(to right, #2EB87A, #5EE8A8)", transition: "width 0.6s ease" }} />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Marcas */}
        <div style={{
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 4,
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#A67CFF" }}>◈ Marcas</span>
          <span style={{ fontSize: 36, fontWeight: 800, color: "#F0EEF8", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{brands?.length ?? 0}</span>
          <span style={{ fontSize: 11, color: "#55526A", marginTop: "auto" }}>ativas no CMS</span>
        </div>

        {/* Usuários */}
        <div style={{
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 4,
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#F0A84A" }}>◎ Usuários</span>
          <span style={{ fontSize: 36, fontWeight: 800, color: "#F0EEF8", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{totalUsers ?? 0}</span>
          <span style={{ fontSize: 11, color: "#55526A", marginTop: "auto" }}>com acesso admin</span>
        </div>

        {/* Campanhas (rascunhos) */}
        {(() => {
          const drafts = (totalCampaigns ?? 0) - (publishedCampaigns ?? 0);
          return (
            <div style={{
              gridColumn: "2 / 4",
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "16px 20px",
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#8E8AA8" }}>◉ Campanhas</span>
                <span style={{ fontSize: 30, fontWeight: 800, color: "#F0EEF8", lineHeight: 1, letterSpacing: "-0.02em" }}>{totalCampaigns ?? 0}</span>
              </div>
              <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.06)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#55526A" }}>Rascunhos</span>
                <span style={{ fontSize: 30, fontWeight: 800, color: "#8E8AA8", lineHeight: 1, letterSpacing: "-0.02em" }}>{drafts}</span>
              </div>
              <Link href="/admin/campaigns/new" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "#A67CFF", textDecoration: "none", whiteSpace: "nowrap", padding: "8px 14px", border: "1px solid rgba(166,124,255,0.3)", borderRadius: 7 }}>
                + Nova campanha
              </Link>
            </div>
          );
        })()}
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
