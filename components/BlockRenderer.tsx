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
  editorMode?: boolean;
};

export function BlockRenderer({ brand, campaign, blocks, editorMode }: Props) {
  return (
    <>
      {blocks.map((block, index) =>
        editorMode ? (
          <div
            key={(block as {_id?:string})._id ?? `${block.type}-${index}`}
            data-block-type={block.type}
            data-block-index={index}
            style={{ position: "relative" }}
          >
            <Render block={block} brand={brand} campaign={campaign} />
          </div>
        ) : (
          <Render
            key={(block as {_id?:string})._id ?? `${block.type}-${index}`}
            block={block}
            brand={brand}
            campaign={campaign}
          />
        )
      )}
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
