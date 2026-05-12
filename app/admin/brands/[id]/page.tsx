import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <main className="admin-main">
        <header className="admin-header">
          <h1>Marca: {id}</h1>
        </header>
        <p style={{ color: "var(--adm-ink-mut)" }}>Editor de marca em construção.</p>
      </main>
    </div>
  );
}
