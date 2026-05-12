import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { sourceId, slug } = await request.json() as { sourceId: string; slug: string };
  if (!slug?.trim()) return new NextResponse("Slug obrigatório", { status: 400 });

  const { data: source, error: fetchErr } = await supabase
    .from("campaigns")
    .select("brand_id, lang, meta, blocks, campaign_data, status")
    .eq("id", sourceId)
    .single();

  if (fetchErr || !source) return new NextResponse("Campanha origem não encontrada", { status: 404 });

  const { data: existing } = await supabase
    .from("campaigns")
    .select("id")
    .eq("brand_id", source.brand_id)
    .eq("slug", slug.trim())
    .maybeSingle();

  if (existing) return new NextResponse("Slug já existe para esta marca", { status: 409 });

  const { data: created, error: createErr } = await supabase
    .from("campaigns")
    .insert({
      brand_id: source.brand_id,
      slug: slug.trim(),
      lang: source.lang,
      meta: source.meta,
      blocks: source.blocks,
      campaign_data: source.campaign_data,
      status: "draft",
    })
    .select("id")
    .single();

  if (createErr) return new NextResponse(createErr.message, { status: 500 });

  return NextResponse.json({ id: created.id });
}
