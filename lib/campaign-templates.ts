// Campaign template definitions — shape mirrors the future Supabase table:
//   campaign_templates (id text PK, name text, description text,
//   category text, blocks jsonb, created_at timestamptz)
//
// Migration path: replace CAMPAIGN_TEMPLATES + BLANK_TEMPLATE with
//   GET /api/admin/campaign-templates → fetch from Supabase.
//   Zero UI changes needed — CampaignWizard consumes CampaignTemplate[] either way.

export interface CampaignTemplate {
  id: string
  name: string
  description: string
  category: "conversao" | "gastronomia" | "informacional" | "oferta" | "storytelling" | "blank"
  categoryLabel: string
  blocks: unknown[]
}

// ── Shared block starters ──────────────────────────────────────────────────

const B = {
  nav: { type: "nav", props: { tag: "Edição especial" } },

  hero: {
    type: "hero",
    props: {
      video: "", poster: "", eyebrow: "Campanha",
      headlineFull: "Título da campanha",
      headlineEmphasis: "campanha",
      typewriter: false,
      subtitle: "Subtítulo da campanha.",
      primaryCta: { label: "Reservar", href: "#unit-picker" },
      meta: [],
    },
  },

  feature: {
    type: "feature",
    props: {
      eyebrow: "A experiência",
      headlineFull: "Título da seção de destaque",
      headlineEmphasis: "destaque",
      body: ["Parágrafo descritivo sobre a experiência oferecida."],
      image: "", imageAlt: "", imagePosition: "right",
    },
  },

  benefits: {
    type: "benefits",
    props: {
      eyebrow: "Benefícios",
      headlineFull: "Por que escolher a Lush",
      headlineEmphasis: "Lush",
      items: [],
    },
  },

  menuGrid: {
    type: "menuGrid",
    props: {
      eyebrow: "Curadoria exclusiva",
      headlineFull: "O menu",
      items: [
        { tag: "Opção 1", name: "Nome do item", description: "Descrição do item." },
      ],
    },
  },

  priceCards: {
    type: "priceCards",
    props: {
      eyebrow: "Por tempo limitado",
      headlineFull: "Escolha sua experiência",
      backgroundImage: "",
      cards: [
        { tag: "Básico", name: "Pacote", price: "R$ 0", note: "Inclui o essencial", highlight: false },
        { tag: "Completo", name: "Pacote Premium", price: "R$ 0", note: "A experiência completa", highlight: true },
      ],
      availability: "Disponível nas unidades Ipiranga e Lapa",
      cta: { label: "Reservar pelo site", href: "https://lushmotel.com.br" },
    },
  },

  unitPicker: {
    type: "unitPicker",
    props: {
      id: "unit-picker",
      eyebrow: "Escolha sua unidade",
      headline: "Reserve agora",
      subtitle: "",
      units: [],
      wizardSteps: [
        { n: 1, label: "Período" },
        { n: 2, label: "Data" },
        { n: 3, label: "Suíte" },
        { n: 4, label: "Resumo" },
      ],
      stepCopy: {
        period: { title: "Escolha o período", hint: "" },
        date: { title: "Escolha a data", hint: "", smallHint: "", couponHint: "" },
        category: { title: "Escolha a suíte", hint: "" },
        summary: {
          title: "Resumo",
          hint: "",
          labels: { unit: "Unidade", period: "Período", date: "Data", category: "Suíte", inclusos: "Inclusos", lot: "Lote", price: "Valor" },
          couponLine: "",
          lotLineNoCoupon: "",
        },
      },
      openCtaLabel: "Reservar",
      confirmCtaLabel: "Confirmar",
    },
  },

  offer: {
    type: "offer",
    props: {
      eyebrow: "Oferta especial",
      headlineFull: "Título da oferta",
      headlineHtml: "Título da <em>oferta</em>",
      subtitle: "",
      ctas: [{ label: "Reservar agora", href: "#unit-picker", variant: "gold" }],
      note: "",
    },
  },

  faq: {
    type: "faq",
    props: {
      eyebrow: "Dúvidas frequentes",
      headlineFull: "Antes de reservar.",
      headlineEmphasis: "reservar.",
      intro: "",
      items: [{ q: "Como funciona?", a: "Resposta aqui." }],
    },
  },

  footer: {
    type: "footer",
    props: {
      tagline: "Hospitalidade privada, desenhada para casais que buscam privacidade e design.",
      columns: [],
      copyright: "© 2026 Lush Hotel Group. Todos os direitos reservados.",
      ageNotice: "Proibido para menores de 18 anos.",
    },
  },

  stickyCta: {
    type: "stickyCta",
    props: { ctas: [{ label: "Reservar", href: "#unit-picker", variant: "gold" }] },
  },
}

// ── Templates ──────────────────────────────────────────────────────────────

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "promo-reserva",
    name: "Promo com reserva",
    description: "Funil completo com wizard de reserva por unidade, lote de preços e CTA fixo no mobile.",
    category: "conversao",
    categoryLabel: "Conversão",
    blocks: [B.nav, B.hero, B.benefits, B.unitPicker, B.offer, B.faq, B.footer, B.stickyCta],
  },
  {
    id: "gastronomia",
    name: "Experiência gastronômica",
    description: "Ideal para menus, combos e pacotes culinários. Feature + grid de pratos + cards de preço.",
    category: "gastronomia",
    categoryLabel: "Gastronomia",
    blocks: [B.nav, B.hero, B.feature, B.menuGrid, B.priceCards, B.faq, B.footer],
  },
  {
    id: "storytelling",
    name: "Storytelling + reserva",
    description: "Narrativa mais longa com seção feature e benefícios antes de apresentar o wizard de reserva.",
    category: "storytelling",
    categoryLabel: "Storytelling",
    blocks: [B.nav, B.hero, B.feature, B.benefits, B.unitPicker, B.faq, B.footer],
  },
  {
    id: "oferta-relampago",
    name: "Oferta relâmpago",
    description: "Foco máximo em conversão rápida: hero impactante, bloco de oferta e reserva direta.",
    category: "oferta",
    categoryLabel: "Oferta",
    blocks: [B.nav, B.hero, B.offer, B.unitPicker, B.footer, B.stickyCta],
  },
  {
    id: "simples",
    name: "Página simples",
    description: "Estrutura mínima informacional. Sem wizard de reserva — ideal para teasers e pré-lançamentos.",
    category: "informacional",
    categoryLabel: "Informacional",
    blocks: [B.nav, B.hero, B.benefits, B.faq, B.footer],
  },
]

export const BLANK_TEMPLATE: CampaignTemplate = {
  id: "blank",
  name: "Em branco",
  description: "Começa sem blocos. Construa do zero pelo editor.",
  category: "blank",
  categoryLabel: "Vazio",
  blocks: [],
}
