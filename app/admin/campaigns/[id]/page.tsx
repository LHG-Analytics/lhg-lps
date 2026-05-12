import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  return (
    <div className="admin-shell">
      <main className="admin-main">
        <header className="admin-header">
          <h1>{campaign?.slug ?? id}</h1>
        </header>
        <p style={{ color: "var(--adm-ink-mut)" }}>Editor de campanha em construção.</p>
      </main>
    </div>
  );
}
