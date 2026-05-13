import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { getUserRole } from "@/lib/admin-role";
import { logAudit } from "@/lib/audit";

type Params = Promise<{ brandId: string }>;

export async function GET(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const { brandId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: brand, error } = await supabase
    .from("brands")
    .select("*, units(*)")
    .eq("id", brandId)
    .single();

  if (error || !brand) return new NextResponse("Marca não encontrada", { status: 404 });
  return NextResponse.json(brand);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { brandId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // Editar marca é privilégio de admin
  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    return new NextResponse("Apenas admins podem editar marcas.", { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;
  const allowed = ["name", "domain", "favicon", "logo", "fonts", "theme", "booking", "concierge"];
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(patch).length === 0)
    return new NextResponse("Nenhum campo válido para atualizar", { status: 400 });

  const { error } = await supabase.from("brands").update(patch).eq("id", brandId);
  if (error) return new NextResponse(error.message, { status: 500 });

  void logAudit(supabase, user.id, user.email, {
    action: "update_brand", entityType: "brand",
    entityId: brandId, details: { fields: Object.keys(patch) },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const { brandId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") return new NextResponse("Apenas admins podem excluir marcas.", { status: 403 });

  // Bloqueia exclusão se houver campanhas publicadas
  const { data: published } = await supabase
    .from("campaigns")
    .select("id")
    .eq("brand_id", brandId)
    .eq("status", "published")
    .limit(1);

  if (published && published.length > 0) {
    return new NextResponse("Não é possível excluir uma marca com campanhas publicadas.", { status: 409 });
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("name")
    .eq("id", brandId)
    .maybeSingle();

  const { error } = await supabase.from("brands").delete().eq("id", brandId);
  if (error) return new NextResponse(error.message, { status: 500 });

  void logAudit(supabase, user.id, user.email, {
    action: "delete_brand", entityType: "brand",
    entityId: brandId, entityLabel: brand?.name,
  });

  return NextResponse.json({ ok: true });
}
