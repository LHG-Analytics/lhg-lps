import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserRole } from "@/lib/admin-role";
import { logAudit } from "@/lib/audit";

const CmsBlockSchema = z.array(
  z.object({ type: z.string(), props: z.record(z.string(), z.unknown()) }).passthrough()
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json() as Record<string, unknown>;

  // Publicar é privilégio de admin
  if (body.status === "published") {
    const role = await getUserRole(supabase, user.id);
    if (role !== "admin") {
      return new NextResponse("Apenas admins podem publicar campanhas.", { status: 403 });
    }
  }

  // Validação estrutural dos blocks
  if (body.blocks !== undefined) {
    const result = CmsBlockSchema.safeParse(body.blocks);
    if (!result.success) {
      const msg = result.error.issues.map((e) => `[${e.path.join(".")}] ${e.message}`).join("; ");
      return new NextResponse(`Blocks inválidos: ${msg}`, { status: 400 });
    }
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("brand_id, slug")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("campaigns")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return new NextResponse(error.message, { status: 500 });

  const action = body.status === "published" ? "publish" : "save_draft";
  void logAudit(supabase, user.id, user.email, {
    action,
    entityType: "campaign",
    entityId:   id,
    entityLabel: campaign?.slug,
    details: { status: body.status, hasBlocks: body.blocks !== undefined },
  });

  if (body.status === "published" && campaign) {
    revalidatePath(`/${campaign.brand_id}/${campaign.slug}`);
  }

  return NextResponse.json({ ok: true });
}
