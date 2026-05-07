import type { Brand, Campaign, Block } from "@/lib/schema";
import { Nav } from "@/components/blocks/Nav";
import { Hero } from "@/components/blocks/Hero";
import { Benefits } from "@/components/blocks/Benefits";
import { UnitPicker } from "@/components/blocks/UnitPicker";
import { Offer } from "@/components/blocks/Offer";
import { FAQ } from "@/components/blocks/FAQ";
import { Footer } from "@/components/blocks/Footer";
import { StickyCta } from "@/components/blocks/StickyCta";

export type BlockContext = {
  brand: Brand;
  campaign: Campaign;
};

type Props = BlockContext & {
  blocks: readonly Block[];
};

/**
 * Despacha cada bloco do campaign.json para seu componente.
 *
 * Regras:
 *   - Sem `eval`. Switch exhaustive — TS reclama se um `type` novo for
 *     adicionado ao schema sem tratamento aqui.
 *   - Blocos que precisam de `brand` ou `campaign` recebem via context;
 *     blocos puramente de copy recebem só `props`.
 *   - Não há lógica de layout aqui. Gap, padding, ordem — tudo no JSON.
 */
export function BlockRenderer({ brand, campaign, blocks }: Props) {
  return (
    <>
      {blocks.map((block, index) => (
        <Render
          key={`${block.type}-${index}`}
          block={block}
          brand={brand}
          campaign={campaign}
        />
      ))}
    </>
  );
}

function Render({
  block,
  brand,
  campaign,
}: { block: Block } & BlockContext) {
  switch (block.type) {
    case "nav":
      return <Nav {...block.props} brand={brand} />;
    case "hero":
      return <Hero {...block.props} brand={brand} />;
    case "benefits":
      return <Benefits {...block.props} />;
    case "unitPicker":
      return <UnitPicker {...block.props} brand={brand} campaign={campaign} />;
    case "offer":
      return <Offer {...block.props} />;
    case "faq":
      return <FAQ {...block.props} />;
    case "footer":
      return <Footer {...block.props} brand={brand} />;
    case "stickyCta":
      return <StickyCta {...block.props} />;
  }
}
