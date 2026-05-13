import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { getUserRole } from "@/lib/admin-role";
import { logAudit } from "@/lib/audit";

type Params = Promise<{ inviteId: string }>;

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { inviteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const { data: invite } = await supabase
    .from("admin_invites")
    .select("email")
    .eq("id", inviteId)
    .maybeSingle();

  const { error } = await supabase
    .from("admin_invites")
    .delete()
    .eq("id", inviteId);

  if (error) return new NextResponse(error.message, { status: 500 });

  void logAudit(supabase, user.id, user.email, {
    action: "cancel_invite", entityType: "brand",
    entityId: inviteId, details: { email: invite?.email },
  });

  return NextResponse.json({ ok: true });
}
