import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { BrandEditor } from "./BrandEditor";

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: brand } = await supabase
    .from("brands")
    .select("*, units(*)")
    .eq("id", id)
    .single();

  if (!brand) notFound();

  return <BrandEditor initial={brand} />;
}
