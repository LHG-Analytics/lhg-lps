import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json() as Record<string, unknown>;

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
