import { z } from "zod";

/* -------------------------------------------------------------
   BRAND
------------------------------------------------------------- */
const FontDef = z.object({
  family: z.string(),
  google: z.string(),
  fallback: z.string(),
});

const ThemeTokens = z.object({
  bg: z.string(),
  bgElev: z.string(),
  bgCard: z.string(),
  line: z.string(),
  lineSoft: z.string(),
  ink: z.string(),
  inkMut: z.string(),
  inkDim: z.string(),
  lavender: z.string(),
  lavenderSoft: z.string(),
  lavenderDeep: z.string(),
  lavenderGrad: z.string(),
  green: z.string(),
  greenDeep: z.string(),
  red: z.string(),
  redDeep: z.string(),
  emerald: z.string(),
  emeraldSoft: z.string(),
  emeraldDeep: z.string(),
  emeraldGrad: z.string(),
  /** Lavanda mais saturada — usada em CTAs de alto contraste (concierge fab). */
  lavBright: z.string(),
  /** Roxo profundo — texto/ícone sobre `lavBright`. */
  inkDeep: z.string(),
});

const Category = z.object({
  id: z.string(),
  name: z.string(),
  meta: z.string(),
  slug: z.string(),
  amenities: z.array(z.string()),
  hero: z.boolean().optional(),
});

const Unit = z.object({
  id: z.string(),
  label: z.string(),
  name: z.string(),
  address: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  bookingBaseUrl: z.string().url(),
  /**
   * Categorias da unidade. `all` é obrigatório (catálogo completo).
   * `"3h"` é opcional: se omitido, períodos com `scopeKey: "3h"` caem
   * de volta em `all` — ou seja, "todas as categorias estão liberadas
   * para 3 horas". Se uma campanha futura quiser restringir de novo,
   * basta declarar o array `"3h"`.
   */
  categories: z.object({
    "3h": z.array(Category).optional(),
    all: z.array(Category),
  }),
});

const Booking = z.object({
  periodIds: z.record(z.string(), z.string()),
  urlTemplate: z.string(),
});

export const BrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  logo: z.object({ src: z.string(), alt: z.string() }),
  /** Favicon da marca — usado no <head> via metadata.icons. Caminho
   * absoluto (relativo a /public). Aplica-se a todas as páginas
   * servidas sob este brand. */
  favicon: z.string(),
  fonts: z.object({
    display: FontDef,
    serif: FontDef,
    sans: FontDef,
  }),
  theme: ThemeTokens,
  units: z.array(Unit),
  booking: Booking,
  /** Botão fixo Concierge 24h (FAB inferior direito). Renderizado em
   * páginas legais e onde for útil. Se ausente, o FAB não aparece. */
  concierge: z
    .object({
      label: z.string(),
      href: z.string(),
    })
    .optional(),
});

export type Brand = z.infer<typeof BrandSchema>;
export type BrandUnit = z.infer<typeof Unit>;
export type BrandCategory = z.infer<typeof Category>;

/* -------------------------------------------------------------
   CAMPAIGN
------------------------------------------------------------- */
const Lot = z.object({
  id: z.string(),
  name: z.string(),
  discountPct: z.number().int().min(0).max(100),
  /** Código de cupom que ativa o desconto no checkout do site oficial.
   * Ausente = lote sem desconto (ex.: "Lote encerrado"). */
  coupon: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
});

const Period = z.object({
  id: z.string(),
  label: z.string(),
  shortLabel: z.string(),
  meta: z.string(),
  scope: z.string(),
  scopeKey: z.enum(["3h", "all"]),
  featured: z.boolean().optional(),
  featuredTag: z.string().optional(),
  inclusos: z.string(),
});

const CampaignDate = z.object({
  value: z.string(),
  day: z.string(),
  dow: z.string(),
  tier: z.enum(["regular", "premium"]),
  label: z.string(),
});

/* -------------------------------------------------------------
   PRICING
   Mapa unit → category → period → { regular, premium } em centavos.
   Centavos como integer evita aritmética com float. Formatação
   acontece no display (lib/pricing.ts → formatBRL).
   Categorias sem entrada de preço são ocultadas no wizard pelo
   UnitPicker — não confiar no usuário ver "preço sob consulta".
------------------------------------------------------------- */
const PriceMatrix = z.object({
  regular: z.number().int().nonnegative(),
  premium: z.number().int().nonnegative(),
});
const CategoryPricing = z.record(z.string(), PriceMatrix);
const UnitPricing = z.record(z.string(), CategoryPricing);
const Pricing = z.object({
  currency: z.literal("BRL"),
  units: z.record(z.string(), UnitPricing),
});

const Range = z.object({
  start: z.string(),
  end: z.string(),
  premium: z.string(),
  label: z.string(),
});

/* -------------------------------------------------------------
   BLOCKS — discriminated union on `type`
------------------------------------------------------------- */
const NavBlock = z.object({
  type: z.literal("nav"),
  props: z.object({ tag: z.string() }),
});

const HeroMeta = z.object({
  label: z.string(),
  value: z.string(),
  highlight: z.string().optional(),
});

const HeroBlock = z.object({
  type: z.literal("hero"),
  props: z.object({
    video: z.string(),
    /** Frame estático para LCP — exibido enquanto o vídeo carrega. */
    poster: z.string().optional(),
    eyebrow: z.string(),
    headlineFull: z.string(),
    headlineEmphasis: z.string(),
    typewriter: z.boolean().optional(),
    subtitle: z.string(),
    primaryCta: z.object({ label: z.string(), href: z.string() }),
    meta: z.array(HeroMeta),
  }),
});

const BenefitsBlock = z.object({
  type: z.literal("benefits"),
  props: z.object({
    eyebrow: z.string(),
    headlineFull: z.string(),
    headlineEmphasis: z.string(),
    items: z.array(
      z.object({
        icon: z.enum(["heart", "calendar", "champagne", "clock"]),
        title: z.string(),
        body: z.string(),
      })
    ),
  }),
});

const UnitPickerBlock = z.object({
  type: z.literal("unitPicker"),
  props: z.object({
    id: z.string(),
    eyebrow: z.string(),
    headline: z.string(),
    subtitle: z.string(),
    units: z.array(z.string()),
    wizardSteps: z.array(z.object({ n: z.number().int(), label: z.string() })),
    stepCopy: z.object({
      period: z.object({ title: z.string(), hint: z.string() }),
      date: z.object({
        title: z.string(),
        hint: z.string(),
        smallHint: z.string(),
        /** Mostrado abaixo do badge do lote ativo. Aceita placeholder
         * `{coupon}` que é substituído pelo código do cupom corrente. */
        couponHint: z.string(),
      }),
      category: z.object({
        title: z.string(),
        hint: z.string(),
        hint3hIpiranga: z.string(),
        hint3hLapa: z.string(),
        hintAllPernoite: z.string(),
      }),
      summary: z.object({
        title: z.string(),
        hint: z.string(),
        labels: z.object({
          unit: z.string(),
          period: z.string(),
          date: z.string(),
          category: z.string(),
          inclusos: z.string(),
          lot: z.string(),
          price: z.string(),
        }),
        /** Linha do "Lote" no resumo quando há cupom ativo. Placeholders
         * `{coupon}` e `{discount}` (ex.: "25%"). */
        couponLine: z.string(),
        /** Linha do "Lote" no resumo quando não há cupom (lote encerrado).
         * Placeholder `{name}`. */
        lotLineNoCoupon: z.string(),
      }),
    }),
    openCtaLabel: z.string(),
    confirmCtaLabel: z.string(),
  }),
});

const CtaVariant = z.enum(["gold", "emerald", "red", "ghost"]);

const OfferBlock = z.object({
  type: z.literal("offer"),
  props: z.object({
    eyebrow: z.string(),
    headlineFull: z.string(),
    headlineHtml: z.string(),
    subtitle: z.string(),
    countdownTo: z.string(),
    ctas: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
        variant: CtaVariant,
        focusUnit: z.string().optional(),
      })
    ),
    note: z.string(),
  }),
});

const FaqBlock = z.object({
  type: z.literal("faq"),
  props: z.object({
    eyebrow: z.string(),
    headlineFull: z.string(),
    headlineEmphasis: z.string(),
    intro: z.string(),
    /** CTA opcional abaixo do intro (ex.: "Falar com concierge").
     * Se ambos `ctaLabel` e `ctaHref` estiverem ausentes, o botão
     * simplesmente não renderiza. */
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
    items: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
});

const FooterLink = z.object({
  label: z.string(),
  href: z.string(),
  focusUnit: z.string().optional(),
});

const FooterPropsSchema = z.object({
  tagline: z.string(),
  columns: z.array(
    z.object({
      title: z.string(),
      links: z.array(FooterLink),
    })
  ),
  copyright: z.string(),
  ageNotice: z.string(),
});

const FooterBlock = z.object({
  type: z.literal("footer"),
  props: FooterPropsSchema,
});

const StickyCtaBlock = z.object({
  type: z.literal("stickyCta"),
  props: z.object({
    ctas: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
        variant: CtaVariant,
        focusUnit: z.string().optional(),
      })
    ),
  }),
});

export const BlockSchema = z.discriminatedUnion("type", [
  NavBlock,
  HeroBlock,
  BenefitsBlock,
  UnitPickerBlock,
  OfferBlock,
  FaqBlock,
  FooterBlock,
  StickyCtaBlock,
]);

export type Block = z.infer<typeof BlockSchema>;
export type NavBlockProps = z.infer<typeof NavBlock>["props"];
export type HeroBlockProps = z.infer<typeof HeroBlock>["props"];
export type BenefitsBlockProps = z.infer<typeof BenefitsBlock>["props"];
export type UnitPickerBlockProps = z.infer<typeof UnitPickerBlock>["props"];
export type OfferBlockProps = z.infer<typeof OfferBlock>["props"];
export type FaqBlockProps = z.infer<typeof FaqBlock>["props"];
export type FooterBlockProps = z.infer<typeof FooterBlock>["props"];
export type StickyCtaBlockProps = z.infer<typeof StickyCtaBlock>["props"];

const AnalyticsSchema = z.object({
  ga4:          z.string().optional(),
  metaPixel:    z.string().optional(),
  gtm:          z.string().optional(),
  tiktokPixel:  z.string().optional(),
}).optional();

export const CampaignSchema = z.object({
  slug: z.string(),
  brand: z.string(),
  lang: z.string(),
  meta: z.object({
    title: z.string(),
    description: z.string(),
    ogTitle:       z.string().optional(),
    ogDescription: z.string().optional(),
    /** URL absoluta da imagem para compartilhamento (og:image / twitter:image).
     * Recomendado: 1200×630 px. Se ausente, sem preview de imagem. */
    ogImage:    z.string().optional(),
    canonical:  z.string().optional(),
    robots:     z.enum(["index", "noindex"]).optional(),
    analytics:  AnalyticsSchema,
  }),
  campaign: z.object({
    name: z.string(),
    range: Range,
    countdown: z.object({ target: z.string() }),
    lots: z.array(Lot),
    periods: z.array(Period),
    dates: z.array(CampaignDate),
    /** Tabela de preços por unit × category × period × tier.
     * Campanha sem `pricing` mostra todas as categorias sem
     * exibir bloco de preço (degradação suave). */
    pricing: Pricing.optional(),
  }),
  blocks: z.array(BlockSchema),
});

export type Campaign = z.infer<typeof CampaignSchema>;
export type Lot = z.infer<typeof Lot>;
export type Period = z.infer<typeof Period>;
export type CampaignDate = z.infer<typeof CampaignDate>;

