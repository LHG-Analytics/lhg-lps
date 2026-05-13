import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { getUserRole } from "@/lib/admin-role";
import { logAudit } from "@/lib/audit";

type Params = Promise<{ userId: string }>;

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") return new NextResponse("Apenas admins podem alterar roles.", { status: 403 });

  if (userId === user.id) return new NextResponse("Não é possível alterar o próprio role.", { status: 400 });

  const { newRole } = await request.json() as { newRole?: string };
  if (newRole !== "admin" && newRole !== "editor") {
    return new NextResponse("Role inválido. Use 'admin' ou 'editor'.", { status: 400 });
  }

  const { error } = await supabase
    .from("admin_profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) return new NextResponse(error.message, { status: 500 });

  void logAudit(supabase, user.id, user.email, {
    action: "update_user_role", entityType: "brand",
    entityId: userId, details: { newRole },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") return new NextResponse("Apenas admins podem remover acessos.", { status: 403 });

  if (userId === user.id) return new NextResponse("Não é possível remover o próprio acesso.", { status: 400 });

  const { error } = await supabase
    .from("admin_profiles")
    .delete()
    .eq("id", userId);

  if (error) return new NextResponse(error.message, { status: 500 });

  void logAudit(supabase, user.id, user.email, {
    action: "remove_user_access", entityType: "brand",
    entityId: userId,
  });

  return NextResponse.json({ ok: true });
}
