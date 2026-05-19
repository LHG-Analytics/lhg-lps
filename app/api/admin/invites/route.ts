import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { getUserRole } from "@/lib/admin-role";
import { logAudit } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const { data, error } = await supabase
    .from("admin_invites")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: false });

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") return new NextResponse("Apenas admins podem convidar usuários.", { status: 403 });

  const { email, inviteRole } = await request.json() as { email?: string; inviteRole?: string };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new NextResponse("E-mail inválido.", { status: 400 });
  }
  if (inviteRole !== "admin" && inviteRole !== "editor") {
    return new NextResponse("Role inválido.", { status: 400 });
  }

  // Verifica se já é um usuário cadastrado
  const { data: existing } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return new NextResponse("Este e-mail já tem acesso ao CMS.", { status: 409 });

  const { error } = await supabase.from("admin_invites").upsert(
    { email: email.toLowerCase().trim(), role: inviteRole, invited_by: user.id },
    { onConflict: "email" }
  );

  if (error) return new NextResponse(error.message, { status: 500 });

  void logAudit(supabase, user.id, user.email, {
    action: "invite_user", entityType: "brand",
    entityId: email, details: { role: inviteRole },
  });

  const loginUrl = `${request.nextUrl.origin}/admin/login`;
  const emailResult = await sendInviteEmail({
    to: email,
    role: inviteRole as "admin" | "editor",
    invitedByEmail: user.email ?? undefined,
    loginUrl,
  });

  if (emailResult?.error) {
    console.error("[invites] Resend error:", emailResult.error);
    return new NextResponse(`Convite salvo, mas falha ao enviar e-mail: ${JSON.stringify(emailResult.error)}`, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
