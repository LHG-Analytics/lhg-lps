import type { Brand, Campaign } from "@/lib/schema";

type Props = { brand: Brand; campaign: Campaign };

export function JsonLd({ brand, campaign }: Props) {
  const faqBlock = campaign.blocks.find((b) => b.type === "faq");
  const offerBlock = campaign.blocks.find((b) => b.type === "offer");

  const graphs: unknown[] = [];

  // LodgingBusiness / Hotel para cada unidade da marca
  for (const unit of brand.units) {
    graphs.push({
      "@type": "LodgingBusiness",
      "@id": `${unit.bookingBaseUrl}#establishment`,
      name: `${brand.name} — ${unit.name}`,
      url: unit.bookingBaseUrl,
      address: { "@type": "PostalAddress", streetAddress: unit.address },
      image: unit.image,
      telephone: brand.concierge?.href?.replace("https://wa.me/", "+") ?? undefined,
    });
  }

  // Offer — exibe desconto da campanha
  if (offerBlock) {
    const op = offerBlock.props as { headlineFull?: string; subtitle?: string; countdownTo?: string };
    graphs.push({
      "@type": "Offer",
      name: op.headlineFull ?? campaign.meta.title,
      description: op.subtitle ?? campaign.meta.description,
      validThrough: op.countdownTo ?? undefined,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
    });
  }

  // FAQPage — itens do bloco de FAQ
  if (faqBlock) {
    const fp = faqBlock.props as { items?: Array<{ q: string; a: string }> };
    if (fp.items && fp.items.length > 0) {
      graphs.push({
        "@type": "FAQPage",
        mainEntity: fp.items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      });
    }
  }

  const schema = {
    "@context": "https://schema.org",
    "@graph": graphs,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
