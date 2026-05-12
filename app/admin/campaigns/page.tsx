import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "../_components/LogoutButton";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, slug, brand_id, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <Image src="/brands/lhg/logos/logo-white.png" alt="LHG" width={120} height={30} style={{ width: "auto", height: 28 }} />
        </div>
        <nav className="admin-nav">
          <a href="/admin" className="admin-nav__item">Dashboard</a>
          <a href="/admin/brands" className="admin-nav__item">Marcas</a>
          <a href="/admin/campaigns" className="admin-nav__item active">Campanhas</a>
        </nav>
        <div className="admin-sidebar__footer">
          <span className="admin-user-email">{user.email}</span>
          <LogoutButton />
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Campanhas</h1>
          <Link href="/admin/campaigns/new" className="admin-btn-primary">
            + Nova campanha
          </Link>
        </header>

        <section className="admin-section">
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
                    <td>
                      <span className={`status-badge status-${c.status}`}>{c.status}</span>
                    </td>
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
            <p className="admin-empty">Nenhuma campanha cadastrada. Crie a primeira acima.</p>
          )}
        </section>
      </main>
    </div>
  );
}
