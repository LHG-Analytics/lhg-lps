import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "./_components/LogoutButton";

const BRANDS = [
  {
    id: "lush",
    name: "Lush Motel",
    domain: "lushmotel.com.br",
    accent: "#CB98FF",
    bg: "#0A1A10",
    logo: "/brands/lush/logo-lush.png",
  },
  {
    id: "andardecima",
    name: "Andar de Cima",
    domain: "andardecimasuites.com.br",
    accent: "#ED0677",
    bg: "#101820",
    logo: "/brands/andardecima/units/svg-adc.png",
  },
  {
    id: "tout",
    name: "Tout Motel",
    domain: "toutmotel.com.br",
    accent: "#FF0FFB",
    bg: "#240A4A",
    logo: "/brands/tout/units/svg-tout.png",
  },
];

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, slug, brand_id, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <Image
            src="/brands/lhg/logos/logo-white.png"
            alt="LHG"
            width={120}
            height={30}
            style={{ width: "auto", height: 28 }}
          />
        </div>
        <nav className="admin-nav">
          <a href="/admin"           className="admin-nav__item active">Dashboard</a>
          <a href="/admin/brands"    className="admin-nav__item">Marcas</a>
          <a href="/admin/campaigns" className="admin-nav__item">Campanhas</a>
          <a href="/admin/users"     className="admin-nav__item">Usuários</a>
          <a href="/admin/audit"     className="admin-nav__item">Auditoria</a>
        </nav>
        <div className="admin-sidebar__footer">
          <span className="admin-user-email">{user.email}</span>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <header className="admin-header">
          <h1>Dashboard</h1>
          <Link href="/admin/campaigns/new" className="admin-btn-primary">
            + Nova campanha
          </Link>
        </header>

        {/* Brand cards */}
        <section className="admin-section">
          <h2 className="admin-section__title">Marcas ativas</h2>
          <div className="brand-grid">
            {BRANDS.map((b) => (
              <Link
                key={b.id}
                href={`/admin/brands/${b.id}`}
                className="brand-card"
                style={{ "--brand-accent": b.accent, "--brand-bg": b.bg } as React.CSSProperties}
              >
                <div className="brand-card__header">
                  <Image
                    src={b.logo}
                    alt={b.name}
                    width={120}
                    height={32}
                    style={{ width: "auto", height: 28, objectFit: "contain" }}
                  />
                </div>
                <div className="brand-card__body">
                  <p className="brand-card__name">{b.name}</p>
                  <p className="brand-card__domain">{b.domain}</p>
                </div>
                <div className="brand-card__footer">
                  <span className="brand-card__cta">Ver campanhas →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent campaigns */}
        <section className="admin-section">
          <h2 className="admin-section__title">Campanhas recentes</h2>
          {campaigns && campaigns.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Marca</th>
                  <th>Status</th>
                  <th>Criada em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td><code>{c.slug}</code></td>
                    <td>{c.brand_id}</td>
                    <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                    <td>{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                    <td>
                      <Link href={`/admin/campaigns/${c.id}`} className="admin-link">
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="admin-empty">Nenhuma campanha cadastrada ainda. Crie a primeira acima.</p>
          )}
        </section>
      </main>
    </div>
  );
}
