import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getAllCampaigns, getBrand, getCampaign } from "@/lib/content";
import { themeStyle } from "@/lib/theme";
import { resolveFontData, fontVars, type BrandFonts, type FontFileEntry } from "@/lib/fonts";
import { BlockRenderer } from "@/components/BlockRenderer";
import { RevealManager } from "@/components/RevealManager";
import { Concierge24h } from "@/components/Concierge24h";
import { AnalyticsScripts, GtmNoscript, type Analytics } from "@/components/AnalyticsScripts";
import { JsonLd } from "@/components/JsonLd";
import { createClient as createSupabasePublic } from "@supabase/supabase-js";
import type { Block, Campaign } from "@/lib/schema";
import { asset } from "@/lib/asset";

const LooseBlockSchema = z.array(
  z.object({ type: z.string(), props: z.record(z.string(), z.unknown()) }).passthrough()
);

// Revalida a cada 60 s — após publicar no CMS, a LP reflete em até 1 minuto
export const revalidate = 60;

type Params = Promise<{ brand: string; campaign: string }>;

export async function generateStaticParams() {
  return getAllCampaigns();
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { brand, campaign } = await params;
  const data = await safeLoad(brand, campaign);
  if (!data) return {};

  const { title, description, ogTitle, ogDescription, ogImage, canonical, robots, geo } = data.campaign.meta;
  const effectiveOgTitle = ogTitle || title;
  const effectiveOgDesc  = ogDescription || description;
  const images = ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: effectiveOgTitle ?? title }] : [];

  // URL canônica vem do campo meta.canonical do JSON/Supabase.
  // Cada campanha declara a URL pública real (ex: lushmotel.com.br/pt-BR/diadosnamorados2026).
  const resolvedCanonical = canonical ?? undefined;

  return {
    title,
    description,
    ...(resolvedCanonical && { alternates: { canonical: resolvedCanonical } }),
    // String crua em vez do objeto Robots do Next: permite anexar `noai`/`noimageai`,
    // diretivas de GEO que o tipo Robots não modela. Bloqueio garantido por bot
    // exigiria robots.txt no nível do site.
    robots: [
      ...(robots === "noindex" ? ["noindex", "nofollow"] : ["index", "follow"]),
      ...(geo?.aiCrawlers === "block" ? ["noai", "noimageai"] : []),
    ].join(", "),
    icons: {
      icon: asset(data.brand.favicon),
      shortcut: asset(data.brand.favicon),
      apple: asset(data.brand.favicon),
    },
    openGraph: {
      title: effectiveOgTitle,
      description: effectiveOgDesc,
      type: "website",
      locale: data.campaign.lang.replace("-", "_"),
      siteName: data.brand.name,
      ...(resolvedCanonical && { url: resolvedCanonical }),
      ...(images.length > 0 && { images }),
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title: effectiveOgTitle,
      description: effectiveOgDesc,
      ...(images.length > 0 && { images: [ogImage!] }),
    },
  };
}

export default async function CampaignPage({ params }: { params: Params }) {
  const { brand: brandId, campaign: campaignSlug } = await params;
  const data = await safeLoad(brandId, campaignSlug);
  if (!data) notFound();

  const analytics = data.campaign.meta.analytics as Analytics | undefined;

  // Preload manual do poster do hero — Next.js 15+/16 App Router não gera
  // <link rel="preload"> automaticamente a partir de <Image priority>.
  const heroBlock = data.campaign.blocks.find(
    (b): b is Extract<Block, { type: "hero" }> => b.type === "hero"
  );
  const heroPoster = heroBlock?.props?.poster as string | undefined;

  // Fontes: CMS override (Supabase) → JSON brand.fonts → undefined
  const { googleFontsUrl, fontFaceCSS, displayFont, bodyFont } = resolveFontData(
    data.cmsFont,
    { display: data.brand.fonts.serif.family, body: data.brand.fonts.sans.family }
  );
  const fontStyle = fontVars(displayFont, bodyFont);

  return (
    <>
      {googleFontsUrl && <link rel="preconnect" href="https://fonts.googleapis.com" />}
      {googleFontsUrl && <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />}
      {googleFontsUrl && <link rel="stylesheet" href={googleFontsUrl} />}
      {fontFaceCSS && <style dangerouslySetInnerHTML={{ __html: fontFaceCSS }} />}
      {heroPoster && (
        <link
          rel="preload"
          as="image"
          href={asset(heroPoster)}
          fetchPriority="high"
          {...(heroPoster.endsWith(".webp") && { type: "image/webp" })}
        />
      )}
      <div style={{ ...themeStyle(data.brand.theme), ...fontStyle }} data-brand={data.brand.id}>
        {analytics?.gtm && <GtmNoscript id={analytics.gtm} />}
        <BlockRenderer
          brand={data.brand}
          campaign={data.campaign}
          blocks={data.campaign.blocks}
        />
        {data.brand.concierge ? (
          <Concierge24h
            label={data.brand.concierge.label}
            href={data.brand.concierge.href}
          />
        ) : null}
        <RevealManager />
        <JsonLd brand={data.brand} campaign={data.campaign} />
        <AnalyticsScripts analytics={analytics} id={`${brandId}-${campaignSlug}`} />
      </div>
    </>
  );
}

/** Esqueleto para campanha que só existe no CMS (sem JSON em disco).
 *
 * Todo campo de `campaign` é `z.string()` sem refinamento, então string vazia
 * mantém o schema válido; o conteúdo real vem do `campaign_data` do Supabase.
 * Sem isto, campanha criada no CMS nunca renderiza — `getCampaign` lança
 * ENOENT e a rota cai em `notFound()`. */
function blankCampaign(brandId: string, slug: string): Campaign {
  return {
    slug,
    brand: brandId,
    lang: "pt-BR",
    meta: { title: "", description: "" },
    campaign: {
      name: "",
      range: { start: "", end: "", premium: "", label: "" },
      countdown: { target: "" },
      lots: [],
      periods: [],
      dates: [],
    },
    blocks: [],
  };
}

async function safeLoad(brandId: string, campaignSlug: string) {
  // Brand é obrigatória: sem brand.json não há tema, unidades nem booking.
  let brand: Awaited<ReturnType<typeof getBrand>>;
  try {
    brand = await getBrand(brandId);
  } catch {
    return null;
  }

  // JSON da campanha é opcional — campanha nascida no CMS não tem arquivo.
  let campaignFromFile: Campaign | null = null;
  try {
    campaignFromFile = await getCampaign(brandId, campaignSlug);
  } catch { /* segue com o esqueleto + dados do Supabase */ }

  {
    // CMS (Supabase) é a fonte de verdade — sobrescreve o JSON quando disponível.
    let campaign = campaignFromFile ?? blankCampaign(brandId, campaignSlug);
    let resolvedBrand = brand;
    let cmsFont: BrandFonts | null = null;
    let publishedInCms = false;
    try {
      const supabase = createSupabasePublic(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const [{ data: row }, { data: brandRow }] = await Promise.all([
        supabase
          .from("campaigns")
          .select("blocks, meta, campaign_data, lang")
          .eq("brand_id", brandId)
          .eq("slug", campaignSlug)
          .eq("status", "published")
          .maybeSingle(),
        supabase
          .from("brands")
          .select("fonts, logo, favicon, booking, concierge")
          .eq("id", brandId)
          .maybeSingle(),
      ]);

      // Row publicada é o que autoriza uma campanha sem JSON a existir
      if (row) {
        publishedInCms = true;
        if (typeof row.lang === "string" && row.lang) {
          campaign = { ...campaign, lang: row.lang };
        }
      }

      // Blocos editáveis pelo CMS
      if (row?.blocks) {
        const parsed = LooseBlockSchema.safeParse(row.blocks);
        if (parsed.success && parsed.data.length > 0) {
          campaign = { ...campaign, blocks: parsed.data as Block[] };
        }
      }

      // Meta SEO + GEO editáveis pelo CMS
      if (row?.meta && typeof row.meta === "object") {
        const incoming = row.meta as Partial<Campaign["meta"]>;
        campaign = { ...campaign, meta: { ...campaign.meta, ...incoming } };
      }

      // Dados de campanha (lots, periods, dates, pricing) editáveis pelo CMS
      if (row?.campaign_data && typeof row.campaign_data === "object") {
        const cd = row.campaign_data as Record<string, unknown>;
        campaign = {
          ...campaign,
          campaign: {
            ...campaign.campaign,
            ...(typeof cd.name === "string"               ? { name: cd.name }                                                      : {}),
            ...(cd.range && typeof cd.range === "object"  ? { range: cd.range as Campaign["campaign"]["range"] }                   : {}),
            ...(cd.countdown && typeof cd.countdown === "object" ? { countdown: cd.countdown as { target: string } }               : {}),
            ...(Array.isArray(cd.lots)    ? { lots: cd.lots    as Campaign["campaign"]["lots"] }                                   : {}),
            ...(Array.isArray(cd.periods) ? { periods: cd.periods as Campaign["campaign"]["periods"] }                             : {}),
            ...(Array.isArray(cd.dates)   ? { dates: cd.dates   as Campaign["campaign"]["dates"] }                                 : {}),
            ...(cd.pricing && typeof cd.pricing === "object" ? { pricing: cd.pricing as Campaign["campaign"]["pricing"] }          : {}),
          },
        };
      }

      // Fontes customizadas pelo CMS
      if (brandRow?.fonts && typeof brandRow.fonts === "object") {
        const f = brandRow.fonts as Record<string, unknown>;
        const str = (k: string) => (typeof f[k] === "string" ? (f[k] as string) : undefined);
        const arr = (k: string) => (Array.isArray(f[k]) ? (f[k] as FontFileEntry[]) : undefined);
        const fonts: BrandFonts = {
          display:           str("display"),
          body:              str("body"),
          displayCustomUrl:  str("displayCustomUrl"),
          displayCustomName: str("displayCustomName"),
          displayFiles:      arr("displayFiles"),
          bodyCustomUrl:     str("bodyCustomUrl"),
          bodyCustomName:    str("bodyCustomName"),
          bodyFiles:         arr("bodyFiles"),
        };
        if (Object.values(fonts).some(Boolean)) cmsFont = fonts;
      }

      // Logo e favicon gerenciados pelo CMS (Vercel Blob)
      if (brandRow?.logo && typeof brandRow.logo === "object") {
        const l = brandRow.logo as { src?: string; alt?: string };
        if (l.src) resolvedBrand = { ...resolvedBrand, logo: { src: l.src, alt: l.alt ?? resolvedBrand.logo.alt } };
      }
      if (typeof brandRow?.favicon === "string" && brandRow.favicon) {
        resolvedBrand = { ...resolvedBrand, favicon: brandRow.favicon };
      }

      // Booking e concierge editáveis pelo CMS
      if (brandRow?.booking && typeof brandRow.booking === "object") {
        const b = brandRow.booking as { periodIds?: Record<string, string>; urlTemplate?: string };
        if (b.urlTemplate) resolvedBrand = { ...resolvedBrand, booking: { ...resolvedBrand.booking, ...b } };
      }
      if (brandRow?.concierge && typeof brandRow.concierge === "object") {
        const c = brandRow.concierge as { label?: string; href?: string };
        if (c.href) resolvedBrand = { ...resolvedBrand, concierge: { label: c.label ?? "Concierge 24h", href: c.href } };
      }
    } catch { /* Supabase indisponível → mantém JSON */ }

    // Sem JSON em disco e sem row publicada, a campanha não existe.
    // Rascunho/arquivada seguem 404 quando não têm arquivo — como esperado.
    if (!campaignFromFile && !publishedInCms) return null;

    return { brand: resolvedBrand, campaign, cmsFont };
  }
}
