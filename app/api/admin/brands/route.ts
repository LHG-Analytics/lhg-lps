import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { getUserRole } from "@/lib/admin-role";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    return new NextResponse("Apenas admins podem criar marcas.", { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;
  const { id, name, domain, favicon, logo, themeColor } = body as {
    id?: string; name?: string; domain?: string;
    favicon?: string; logo?: Record<string, unknown>; themeColor?: string;
  };

  if (!id || typeof id !== "string" || !/^[a-z0-9-]+$/.test(id)) {
    return new NextResponse("ID inválido. Use apenas letras minúsculas, números e hífens.", { status: 400 });
  }
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return new NextResponse("Nome é obrigatório (mínimo 2 caracteres).", { status: 400 });
  }
  if (!favicon || typeof favicon !== "string" || favicon.trim().length === 0) {
    return new NextResponse("Favicon é obrigatório.", { status: 400 });
  }

  const initialTheme = themeColor ? { lav: themeColor, "lav-bright": themeColor } : {};

  const { error } = await supabase.from("brands").insert({
    id:      id.trim(),
    name:    name.trim(),
    domain:  domain?.trim() || null,
    favicon: favicon.trim(),
    logo:    logo ?? {},
    theme:   initialTheme,
    fonts:   {},
  });

  if (error) {
    if (error.code === "23505") return new NextResponse("Já existe uma marca com esse ID.", { status: 409 });
    return new NextResponse(error.message, { status: 500 });
  }

  void logAudit(supabase, user.id, user.email, {
    action: "create_brand", entityType: "brand",
    entityId: id, entityLabel: name,
  });

  return NextResponse.json({ id }, { status: 201 });
}
