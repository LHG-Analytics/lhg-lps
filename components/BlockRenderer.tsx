import type { Brand, Campaign, Block } from "@/lib/schema";
import dynamic from "next/dynamic";
import { Nav } from "@/components/blocks/Nav";
import { Hero } from "@/components/blocks/Hero";

// Blocos below-the-fold carregados sob demanda — reduz TBT e bundle inicial
const Benefits  = dynamic(() => import("@/components/blocks/Benefits").then(m => m.Benefits));
const UnitPicker = dynamic(() => import("@/components/blocks/UnitPicker").then(m => m.UnitPicker));
const Offer     = dynamic(() => import("@/components/blocks/Offer").then(m => m.Offer));
const FAQ       = dynamic(() => import("@/components/blocks/FAQ").then(m => m.FAQ));
const Footer    = dynamic(() => import("@/components/blocks/Footer").then(m => m.Footer));
const StickyCta = dynamic(() => import("@/components/blocks/StickyCta").then(m => m.StickyCta));

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
    cssVars?: Record<string, string>;
    elementOverrides?: Record<string, Record<string, string>>;
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
        const cssVarsStyle = s?.cssVars
          ? Object.fromEntries(Object.entries(s.cssVars).map(([k, v]) => [`--${k}`, v])) as React.CSSProperties
          : {};
        const wrapStyle: React.CSSProperties = {
          ...cssVarsStyle,
          ...(s?.bg            ? { background:    s.bg            } : {}),
          ...(s?.color         ? { color:         s.color         } : {}),
          ...(s?.paddingTop    ? { paddingTop:    s.paddingTop    } : {}),
          ...(s?.paddingBottom ? { paddingBottom: s.paddingBottom } : {}),
          ...(s?.paddingLeft   ? { paddingLeft:   s.paddingLeft   } : {}),
          ...(s?.paddingRight  ? { paddingRight:  s.paddingRight  } : {}),
          ...(s?.borderRadius  ? { borderRadius:  s.borderRadius  } : {}),
          ...(s?.opacity !== undefined && s.opacity < 100 ? { opacity: s.opacity / 100 } : {}),
        };

        const overridesCSS = s?.elementOverrides
          ? Object.entries(s.elementOverrides)
              .map(([sel, props]) => {
                const decls = Object.entries(props).map(([p, v]) => `${p}: ${v}`).join("; ");
                return `[data-block-id="${key}"] ${sel} { ${decls} }`;
              })
              .join("\n")
          : "";

        if (editorMode) {
          return (
            <div
              key={key}
              data-block-type={block.type}
              data-block-index={index}
              data-block-id={key}
              style={{ position: "relative", ...wrapStyle }}
            >
              {overridesCSS && <style>{overridesCSS}</style>}
              <Render block={block} brand={brand} campaign={campaign} />
            </div>
          );
        }

        if (Object.keys(wrapStyle).length > 0 || overridesCSS) {
          return (
            <div key={key} data-block-id={key} style={wrapStyle}>
              {overridesCSS && <style>{overridesCSS}</style>}
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
