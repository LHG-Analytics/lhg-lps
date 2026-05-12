import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json() as {
    /* duplicar campanha existente */
    sourceId?: string;
    slug?: string;
    /* criar nova campanha */
    brandId?: string;
    lang?: string;
    meta?: { title?: string; description?: string };
    blocks?: unknown[];
  };

  if (!body.slug?.trim()) return new NextResponse("Slug obrigatório", { status: 400 });
  const slug = body.slug.trim();

  /* ── duplicar ────────────────────────────────── */
  if (body.sourceId) {
    const { data: source, error: fetchErr } = await supabase
      .from("campaigns")
      .select("brand_id, lang, meta, blocks, campaign_data")
      .eq("id", body.sourceId)
      .single();

    if (fetchErr || !source) return new NextResponse("Campanha origem não encontrada", { status: 404 });

    const { data: existing } = await supabase
      .from("campaigns")
      .select("id")
      .eq("brand_id", source.brand_id)
      .eq("slug", slug)
      .maybeSingle();

    if (existing) return new NextResponse("Slug já existe para esta marca", { status: 409 });

    const { data: created, error: createErr } = await supabase
      .from("campaigns")
      .insert({
        brand_id: source.brand_id,
        slug,
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

  /* ── criar do zero ───────────────────────────── */
  if (!body.brandId) return new NextResponse("brandId obrigatório para nova campanha", { status: 400 });

  const { data: existing } = await supabase
    .from("campaigns")
    .select("id")
    .eq("brand_id", body.brandId)
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return new NextResponse("Slug já existe para esta marca", { status: 409 });

  const { data: created, error: createErr } = await supabase
    .from("campaigns")
    .insert({
      brand_id: body.brandId,
      slug,
      lang: body.lang ?? "pt-BR",
      meta: body.meta ?? {},
      blocks: body.blocks ?? [],
      status: "draft",
    })
    .select("id")
    .single();

  if (createErr) return new NextResponse(createErr.message, { status: 500 });
  return NextResponse.json({ id: created.id });
}
