import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/admin-role";
import { AdminShell } from "../_components/AdminShell";
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
    <AdminShell userEmail={user.email!}>
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
    </AdminShell>
  );
}
