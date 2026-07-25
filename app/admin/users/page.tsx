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
    supabase.rpc("get_admin_profiles_with_last_seen"),
    supabase
      .from("admin_invites")
      .select("id, email, role, created_at, expires_at")
      .order("created_at", { ascending: false }),
  ]);

  // Oculta convites de quem já tem perfil (convite não apagado na aceitação)
  const profileEmails = new Set((profiles ?? []).map((p: { email?: string | null }) => p.email).filter(Boolean))
  const pendingInvites = (invites ?? []).filter((i) => !profileEmails.has(i.email))

  return (
    <AdminShell userEmail={user.email!}>
      <header className="admin-header">
        <h1>Usuários</h1>
      </header>
      <section className="admin-section">
        <UsersTable
          profiles={profiles ?? []}
          initialInvites={pendingInvites}
          currentUserId={user.id}
        />
      </section>
    </AdminShell>
  );
}
