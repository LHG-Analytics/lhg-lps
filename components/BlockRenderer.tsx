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

type BlockWithMeta = Block & {
  _id?: string;
  _style?: {
    bg?: string;
    color?: string;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    borderRadius?: number;
    opacity?: number;
  };
};

export function BlockRenderer({ brand, campaign, blocks, editorMode }: Props) {
  return (
    <>
      {blocks.map((block, index) => {
        const b = block as BlockWithMeta;
        const key = b._id ?? `${block.type}-${index}`;
        const s = b._style;
        const wrapStyle: React.CSSProperties = {
          ...(s?.bg            ? { background:    s.bg            } : {}),
          ...(s?.color         ? { color:         s.color         } : {}),
          ...(s?.paddingTop    ? { paddingTop:    s.paddingTop    } : {}),
          ...(s?.paddingBottom ? { paddingBottom: s.paddingBottom } : {}),
          ...(s?.paddingLeft   ? { paddingLeft:   s.paddingLeft   } : {}),
          ...(s?.paddingRight  ? { paddingRight:  s.paddingRight  } : {}),
          ...(s?.borderRadius  ? { borderRadius:  s.borderRadius  } : {}),
          ...(s?.opacity !== undefined && s.opacity < 100 ? { opacity: s.opacity / 100 } : {}),
        };

        if (editorMode) {
          return (
            <div
              key={key}
              data-block-type={block.type}
              data-block-index={index}
              style={{ position: "relative", ...wrapStyle }}
            >
              <Render block={block} brand={brand} campaign={campaign} />
            </div>
          );
        }

        if (Object.keys(wrapStyle).length > 0) {
          return (
            <div key={key} style={wrapStyle}>
              <Render block={block} brand={brand} campaign={campaign} />
            </div>
          );
        }

        return (
          <Render key={key} block={block} brand={brand} campaign={campaign} />
        );
      })}
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
