import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserRole } from "@/lib/admin-role";
import { logAudit } from "@/lib/audit";

const CmsBlockSchema = z.array(
  z.object({ type: z.string(), props: z.record(z.string(), z.unknown()) }).passthrough()
);

const PriceMatrixSchema = z.object({
  regular: z.number().int().nonnegative(),
  premium: z.number().int().nonnegative(),
});

const CampaignDataSchema = z.object({
  lots: z.array(z.object({
    id: z.string(),
    name: z.string(),
    discountPct: z.number().int().min(0).max(100),
    coupon: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    before: z.string().optional(),
    after: z.string().optional(),
  })).optional(),
  periods: z.array(z.object({
    id: z.string(),
    label: z.string(),
    shortLabel: z.string(),
    meta: z.string(),
    scope: z.string(),
    scopeKey: z.enum(["3h", "all"]),
    featured: z.boolean().optional(),
    featuredTag: z.string().optional(),
    inclusos: z.string(),
  })).optional(),
  dates: z.array(z.object({
    value: z.string(),
    day: z.string(),
    dow: z.string(),
    tier: z.enum(["regular", "premium"]),
    label: z.string(),
  })).optional(),
  pricing: z.object({
    currency: z.literal("BRL"),
    units: z.record(z.string(), z.record(z.string(), z.record(z.string(), PriceMatrixSchema))),
  }).optional(),
}).passthrough();

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

  // Validação do caminho base. Um path de segmento único (ex.: "/campanhas")
  // vira prefixo de todas as campanhas do namespace e captura o tráfego delas,
  // então exige-se ao menos dois segmentos. Barra final é normalizada.
  if (typeof body.base_path === "string" && body.base_path.trim()) {
    const normalized = body.base_path.trim().replace(/\/+$/, "");
    if (!normalized.startsWith("/")) {
      return new NextResponse("O caminho base deve começar com /", { status: 400 });
    }
    if (normalized.split("/").filter(Boolean).length < 2) {
      return new NextResponse(
        `"${normalized}" é genérico demais: um caminho de um só segmento captura todas as campanhas abaixo dele. Use algo como "${normalized}/nome-da-campanha".`,
        { status: 400 }
      );
    }
    body.base_path = normalized;
  }

  // Validação dos dados de campanha (periods, lots, pricing, dates)
  if (body.campaign_data !== undefined) {
    const result = CampaignDataSchema.safeParse(body.campaign_data);
    if (!result.success) {
      const msg = result.error.issues.map((e) => `[${e.path.join(".")}] ${e.message}`).join("; ");
      return new NextResponse(`campaign_data inválido: ${msg}`, { status: 400 });
    }
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("brand_id, slug, base_path, blocks, meta, campaign_data")
    .eq("id", id)
    .single();

  // Nome da campanha vive dentro de campaign_data. O merge acontece aqui porque
  // um PATCH substitui o JSONB inteiro — se o cliente mandasse só { name }, os
  // lotes, períodos e a tabela de preços seriam apagados.
  if (typeof body.campaign_name === "string") {
    const current = (campaign?.campaign_data ?? {}) as Record<string, unknown>;
    body.campaign_data = { ...current, name: body.campaign_name.trim() };
    delete body.campaign_name;
  }

  // Renomear slug: muda a rota interna e, por consequência, a URL pública.
  let previousSlug: string | null = null;
  if (typeof body.slug === "string") {
    const nextSlug = body.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
      return new NextResponse(
        "Slug inválido: use apenas letras minúsculas, números e hífens.",
        { status: 400 }
      );
    }
    body.slug = nextSlug;
    if (campaign && campaign.slug !== nextSlug) {
      previousSlug = campaign.slug;
      // base_path derivado do slug acompanha a renomeação. Caminho que o editor
      // digitou à mão é preservado — só o padrão /campanhas/<slug> é seguido.
      if (body.base_path === undefined && campaign.base_path === `/campanhas/${campaign.slug}`) {
        body.base_path = `/campanhas/${nextSlug}`;
      }
    }
  }

  // Grava snapshot antes de publicar para permitir rollback
  if (body.status === "published" && campaign) {
    void (async () => {
      await supabase.from("campaign_snapshots").insert({
        campaign_id:   id,
        created_by:    user.id,
        blocks:        campaign.blocks,
        meta:          campaign.meta,
        campaign_data: campaign.campaign_data,
        label:         `Antes de publicar — ${new Date().toLocaleString("pt-BR")}`,
      });
      // Mantém apenas os 10 snapshots mais recentes por campanha
      const { data: old } = await supabase
        .from("campaign_snapshots")
        .select("id")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false })
        .range(10, 999);
      if (old && old.length > 0) {
        await supabase
          .from("campaign_snapshots")
          .delete()
          .in("id", old.map((r) => r.id));
      }
    })();
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    // Violação de unicidade chega como mensagem crua do Postgres; traduz para
    // algo que diga ao editor o que fazer.
    if (error.code === "23505" || /duplicate key|unique constraint/i.test(error.message)) {
      if (/base_path/.test(error.message)) {
        return new NextResponse(
          "Outra campanha desta marca já usa este caminho base. Escolha um caminho diferente ou libere o da campanha antiga.",
          { status: 409 }
        );
      }
      if (/custom_domain/.test(error.message)) {
        return new NextResponse(
          "Este domínio já está em uso por outra campanha. Escolha outro subdomínio.",
          { status: 409 }
        );
      }
      if (/slug/.test(error.message)) {
        return new NextResponse(
          "Outra campanha desta marca já usa este slug. Escolha outro.",
          { status: 409 }
        );
      }
      return new NextResponse("Esse valor já está em uso por outra campanha.", { status: 409 });
    }
    return new NextResponse(error.message, { status: 500 });
  }

  const action = body.status === "published" ? "publish" : "save_draft";
  void logAudit(supabase, user.id, user.email, {
    action,
    entityType: "campaign",
    entityId:   id,
    entityLabel: campaign?.slug,
    details: { status: body.status, hasBlocks: body.blocks !== undefined },
  });

  if (campaign) {
    const brand = campaign.brand_id;
    const currentSlug = typeof body.slug === "string" ? body.slug : campaign.slug;
    if (body.status === "published" || previousSlug) {
      revalidatePath(`/${brand}/${currentSlug}`);
    }
    // Renomear deixa a rota antiga em cache servindo a LP; invalida também.
    if (previousSlug) revalidatePath(`/${brand}/${previousSlug}`);
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/campaigns/[id]
 *
 * Duas operações distintas, escolhidas por query param:
 *   (padrão)          → arquiva, mantendo a linha e o histórico
 *   ?permanent=true   → apaga a linha do banco, sem volta
 *
 * A exclusão definitiva remove os snapshots junto, via
 * `campaign_snapshots_campaign_id_fkey ON DELETE CASCADE`.
 *
 * Campanha publicada é recusada nas duas: despublicar primeiro é a trava que
 * impede tirar do ar uma URL divulgada com um clique só.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const permanent = new URL(request.url).searchParams.get("permanent") === "true";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") return new NextResponse("Apenas admins podem excluir campanhas.", { status: 403 });

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("slug, brand_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!campaign) return new NextResponse("Campanha não encontrada", { status: 404 });

  if (campaign.status === "published") {
    return new NextResponse(
      "Esta campanha está publicada. Despublique antes de arquivar ou excluir.",
      { status: 409 }
    );
  }

  if (permanent) {
    const { count, error } = await supabase
      .from("campaigns")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) return new NextResponse(error.message, { status: 500 });
    // Sem linha afetada = RLS barrou ou alguém já apagou; não mentir que deu certo.
    if (count === 0) {
      return new NextResponse("Nada foi excluído — a campanha já não existia.", { status: 409 });
    }

    void logAudit(supabase, user.id, user.email, {
      action: "delete_campaign", entityType: "campaign",
      entityId: id, entityLabel: campaign.slug,
      details: { permanent: true, previousStatus: campaign.status, brandId: campaign.brand_id },
    });

    return NextResponse.json({ ok: true, permanent: true });
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return new NextResponse(error.message, { status: 500 });

  void logAudit(supabase, user.id, user.email, {
    action: "archive_campaign", entityType: "campaign",
    entityId: id, entityLabel: campaign.slug,
    details: { previousStatus: campaign.status },
  });

  return NextResponse.json({ ok: true, permanent: false });
}
