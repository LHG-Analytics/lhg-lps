import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "../_components/LogoutButton";

export default async function BrandsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, domain, logo, theme")
    .order("name");

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <Image src="/brands/lhg/logos/logo-white.png" alt="LHG" width={120} height={30} style={{ width: "auto", height: 28 }} />
        </div>
        <nav className="admin-nav">
          <a href="/admin" className="admin-nav__item">Dashboard</a>
          <a href="/admin/brands" className="admin-nav__item active">Marcas</a>
          <a href="/admin/campaigns" className="admin-nav__item">Campanhas</a>
        </nav>
        <div className="admin-sidebar__footer">
          <span className="admin-user-email">{user.email}</span>
          <LogoutButton />
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Marcas</h1>
        </header>

        <section className="admin-section">
          <h2 className="admin-section__title">Marcas ativas</h2>
          <div className="brand-grid">
            {brands?.map((b) => {
              const theme = b.theme as { bg?: string; lav?: string } | null;
              const logo = b.logo as { src?: string; alt?: string } | null;
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
                    <p className="brand-card__domain">{b.domain}</p>
                  </div>
                  <div className="brand-card__footer">
                    <span className="brand-card__cta">Ver detalhes →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
