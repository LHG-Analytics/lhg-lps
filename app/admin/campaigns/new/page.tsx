import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <main className="admin-main">
        <header className="admin-header">
          <h1>Nova campanha</h1>
        </header>
        <p style={{ color: "var(--adm-ink-mut)" }}>Formulário de criação em construção.</p>
      </main>
    </div>
  );
}
