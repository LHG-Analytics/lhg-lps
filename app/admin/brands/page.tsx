import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminShell } from "../_components/AdminShell";

export default async function BrandsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, domain, logo, theme")
    .order("name");

  return (
    <AdminShell userEmail={user.email!}>
      <header className="admin-header">
        <h1>Marcas</h1>
        <Link href="/admin/brands/new" className="admin-btn-primary">
          + Nova marca
        </Link>
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
                  <p className="brand-card__domain">{b.domain ?? "—"}</p>
                </div>
                <div className="brand-card__footer">
                  <span className="brand-card__cta">Ver detalhes →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </AdminShell>
  );
}
