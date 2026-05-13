import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminShell } from "../_components/AdminShell";
import { CampaignFilters } from "./CampaignFilters";

const PAGE_SIZE = 20;

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brand?: string; status?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { q, brand, status, page: pageStr } = await searchParams;
  const page   = Math.max(1, Number(pageStr ?? 1));
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("campaigns")
    .select("id, slug, brand_id, status, created_at, meta", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q?.trim())      query = query.or(`slug.ilike.%${q.trim()}%,brand_id.ilike.%${q.trim()}%`);
  if (brand?.trim())  query = query.eq("brand_id", brand.trim());
  if (status?.trim()) query = query.eq("status", status.trim());

  const { data: campaigns, count } = await query;
  const total = count ?? 0;

  const [{ data: brandsRows }, { data: brandNames }] = await Promise.all([
    supabase.from("campaigns").select("brand_id").order("brand_id"),
    supabase.from("brands").select("id, name"),
  ]);
  const brands = [...new Set((brandsRows ?? []).map((r) => r.brand_id as string))];
  const brandNameMap = Object.fromEntries((brandNames ?? []).map((b) => [b.id, b.name]));

  return (
    <AdminShell userEmail={user.email!}>
      <header className="admin-header">
        <h1>Campanhas</h1>
        <Link href="/admin/campaigns/new" className="admin-btn-primary">
          + Nova campanha
        </Link>
      </header>

      <section className="admin-section">
        <Suspense>
          <CampaignFilters brands={brands} total={total} page={page} />
        </Suspense>

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
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">
            {(q || brand || status)
              ? "Nenhuma campanha encontrada com esses filtros."
              : "Nenhuma campanha cadastrada. Crie a primeira acima."}
          </p>
        )}
      </section>
    </AdminShell>
  );
}
