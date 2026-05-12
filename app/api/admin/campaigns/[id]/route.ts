import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validação estrutural leve — garante que blocks é array de {type,props}
// sem rejeitar blocos em edição parcial. Protege contra corrupção de dados.
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

  // Valida blocks se presentes — rejeita se estrutura está corrompida
  if (body.blocks !== undefined) {
    const result = CmsBlockSchema.safeParse(body.blocks);
    if (!result.success) {
      const msg = result.error.issues.map((e) => `[${e.path.join(".")}] ${e.message}`).join("; ");
      return new NextResponse(`Blocks inválidos: ${msg}`, { status: 400 });
    }
  }

  // Busca brand_id e slug para revalidar a rota de produção ao publicar
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

  // Ao publicar, invalida o cache ISR da LP imediatamente
  if (body.status === "published" && campaign) {
    revalidatePath(`/${campaign.brand_id}/${campaign.slug}`);
  }

  return NextResponse.json({ ok: true });
}
