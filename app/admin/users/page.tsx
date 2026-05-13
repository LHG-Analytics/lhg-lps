import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/admin-role";
import { LogoutButton } from "../_components/LogoutButton";
import { UsersTable } from "./UsersTable";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") redirect("/admin");

  const [{ data: profiles }, { data: invites }] = await Promise.all([
    supabase
      .from("admin_profiles")
      .select("id, name, email, role, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("admin_invites")
      .select("id, email, role, created_at, expires_at")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <Image src="/brands/lhg/logos/logo-white.png" alt="LHG" width={120} height={30} style={{ width: "auto", height: 28 }} />
        </div>
        <nav className="admin-nav">
          <a href="/admin"           className="admin-nav__item">Dashboard</a>
          <a href="/admin/brands"    className="admin-nav__item">Marcas</a>
          <a href="/admin/campaigns" className="admin-nav__item">Campanhas</a>
          <a href="/admin/users"     className="admin-nav__item active">Usuários</a>
          <a href="/admin/audit"     className="admin-nav__item">Auditoria</a>
        </nav>
        <div className="admin-sidebar__footer">
          <span className="admin-user-email">{user.email}</span>
          <LogoutButton />
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Usuários</h1>
        </header>
        <section className="admin-section">
          <UsersTable
            profiles={profiles ?? []}
            initialInvites={invites ?? []}
            currentUserId={user.id}
          />
        </section>
      </main>
    </div>
  );
}
