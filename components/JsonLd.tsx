import type { Brand, Campaign, CampaignGeo } from "@/lib/schema";

type Props = { brand: Brand; campaign: Campaign };

/** Remove chaves com valor undefined/null/"" para não poluir o JSON-LD. */
function clean<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ) as T;
}

/**
 * JsonLd — schema.org em `@graph` para SEO e GEO.
 *
 * Duas fontes, nesta ordem de precedência:
 *   1. `campaign.meta.geo` — fatos declarados no CMS (painel GEO). Autoridade.
 *   2. Blocos da campanha — derivação automática, usada onde (1) está vazio.
 *
 * O bloco de dados que os LLMs mais consomem é o par
 * `description` + `AggregateOffer` + `FAQPage`: é dali que saem preço,
 * validade e respostas citadas em ChatGPT / Perplexity / AI Overviews.
 */
export function JsonLd({ brand, campaign }: Props) {
  const geo: CampaignGeo = campaign.meta.geo ?? {};

  const faqBlock = campaign.blocks.find((b) => b.type === "faq");
  const offerBlock = campaign.blocks.find((b) => b.type === "offer");
  const priceBlock = campaign.blocks.find((b) => b.type === "priceCards");

  const pageUrl = campaign.meta.canonical;
  const currency = geo.priceCurrency || "BRL";

  /** Descrição canônica: resumo factual do GEO > meta description. */
  const description = geo.summary?.trim() || campaign.meta.description;

  const graphs: unknown[] = [];

  /* ── LodgingBusiness por unidade ───────────────────── */
  for (const unit of brand.units) {
    graphs.push(clean({
      "@type": "LodgingBusiness",
      "@id": `${unit.bookingBaseUrl}#establishment`,
      name: `${brand.name} — ${unit.name}`,
      url: unit.bookingBaseUrl,
      address: { "@type": "PostalAddress", streetAddress: unit.address, addressCountry: "BR" },
      image: unit.image,
      telephone: brand.concierge?.href?.match(/\d{10,}/)?.[0]
        ? `+${brand.concierge.href.match(/\d{10,}/)![0]}`
        : undefined,
      priceRange: geo.priceLow !== undefined && geo.priceHigh !== undefined
        ? `${currency} ${geo.priceLow}–${geo.priceHigh}`
        : undefined,
    }));
  }

  /* ── Oferta agregada — preço é o dado mais citado ──── */
  const hasPrice = geo.priceLow !== undefined || geo.priceHigh !== undefined;
  const aggregateOffer = hasPrice
    ? clean({
        "@type": "AggregateOffer",
        priceCurrency: currency,
        lowPrice: geo.priceLow ?? geo.priceHigh,
        highPrice: geo.priceHigh ?? geo.priceLow,
        offerCount: (priceBlock?.props as { cards?: unknown[] } | undefined)?.cards?.length,
        availability: "https://schema.org/InStock",
        validFrom: geo.validFrom,
        validThrough: geo.validThrough,
        url: pageUrl,
      })
    : null;

  /* ── Entidade principal da campanha ────────────────── */
  const contentType = geo.contentType ?? "Offer";
  const offerProps = offerBlock?.props as { headlineFull?: string; subtitle?: string; countdownTo?: string } | undefined;
  const entityName = campaign.campaign.name || offerProps?.headlineFull || campaign.meta.title;

  const audience = geo.audience?.trim()
    ? { "@type": "Audience", audienceType: geo.audience.trim() }
    : undefined;

  if (contentType === "Event") {
    graphs.push(clean({
      "@type": "Event",
      name: entityName,
      description,
      startDate: geo.validFrom,
      endDate: geo.validThrough ?? offerProps?.countdownTo,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: brand.units.map((u) => ({
        "@type": "Place",
        name: `${brand.name} — ${u.name}`,
        address: { "@type": "PostalAddress", streetAddress: u.address, addressCountry: "BR" },
      })),
      organizer: { "@type": "Organization", name: brand.name, url: `https://${brand.domain}` },
      url: pageUrl,
      image: campaign.meta.ogImage,
      ...(aggregateOffer && { offers: aggregateOffer }),
      ...(audience && { audience }),
    }));
  } else if (contentType === "Product") {
    graphs.push(clean({
      "@type": "Product",
      name: entityName,
      description,
      brand: { "@type": "Brand", name: brand.name },
      url: pageUrl,
      image: campaign.meta.ogImage,
      ...(aggregateOffer && { offers: aggregateOffer }),
      ...(audience && { audience }),
    }));
  } else if (contentType === "Service") {
    graphs.push(clean({
      "@type": "Service",
      name: entityName,
      description,
      provider: { "@type": "Organization", name: brand.name, url: `https://${brand.domain}` },
      areaServed: { "@type": "City", name: "São Paulo" },
      url: pageUrl,
      ...(aggregateOffer && { offers: aggregateOffer }),
      ...(audience && { audience }),
    }));
  } else {
    graphs.push(clean({
      "@type": "Offer",
      name: entityName,
      description,
      priceCurrency: currency,
      ...(geo.priceLow !== undefined && { price: geo.priceLow }),
      ...(hasPrice && geo.priceHigh !== undefined && geo.priceLow !== geo.priceHigh && {
        priceSpecification: {
          "@type": "PriceSpecification",
          minPrice: geo.priceLow,
          maxPrice: geo.priceHigh,
          priceCurrency: currency,
        },
      }),
      availability: "https://schema.org/InStock",
      validFrom: geo.validFrom,
      validThrough: geo.validThrough ?? offerProps?.countdownTo,
      url: pageUrl,
      seller: { "@type": "Organization", name: brand.name, url: `https://${brand.domain}` },
      ...(audience && { eligibleCustomerType: geo.audience }),
    }));
  }

  /* ── FAQPage — GEO tem precedência sobre o bloco ───── */
  const faqItems =
    geo.qa?.filter((i) => i.q.trim() && i.a.trim()) ??
    (faqBlock?.props as { items?: Array<{ q: string; a: string }> } | undefined)?.items ??
    [];

  if (faqItems.length > 0) {
    graphs.push({
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }

  /* ── WebPage — âncora dos fatos enumeráveis ────────── */
  const keyFacts = geo.keyFacts?.filter((f) => f.trim()) ?? [];
  graphs.push(clean({
    "@type": "WebPage",
    "@id": pageUrl ? `${pageUrl}#webpage` : undefined,
    name: campaign.meta.title,
    description,
    url: pageUrl,
    inLanguage: campaign.lang,
    isPartOf: { "@type": "WebSite", name: brand.name, url: `https://${brand.domain}` },
    ...(keyFacts.length > 0 && {
      // ItemList de fatos atômicos — formato que LLMs extraem com alta fidelidade
      mainEntity: {
        "@type": "ItemList",
        name: `${entityName} — informações principais`,
        itemListElement: keyFacts.map((fact, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: fact,
        })),
      },
    }),
  }));

  const schema = { "@context": "https://schema.org", "@graph": graphs };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
