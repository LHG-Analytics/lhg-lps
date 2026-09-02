import Image from "next/image";
import type { Brand, MenuBlockProps } from "@/lib/schema";

type Props = MenuBlockProps & { brand: Brand };

/** Destaca o símbolo da moeda em corpo menor, como no impresso.
 * Formato desconhecido cai no texto puro — nada de quebrar por regex. */
function Price({ value }: { value: string }) {
  const m = value.match(/^\s*(R\$)\s*(.+)$/);
  if (!m) return <span className="menu-item__price">{value}</span>;
  return (
    <span className="menu-item__price">
      <span className="menu-item__cur">{m[1]}</span>
      {m[2]}
    </span>
  );
}

function Ornament() {
  return <span className="menu-sec__orn" aria-hidden="true" />;
}

/**
 * Menu — cardápio impresso em 3 colunas.
 *
 * Toda leitura de array e de campo com default é defensiva de propósito. Os
 * tipos vêm do `CampaignSchema`, mas o caminho do CMS não usa esse schema: o
 * preview (`admin/preview/…`) faz cast cru do JSONB e a LP publicada valida
 * com um schema `passthrough`. Em nenhum dos dois os `.default()` do Zod são
 * aplicados, então uma seção sem `items` — legítima, quando ela só tem
 * `inlineItems` — chega com `undefined` e derrubaria a página inteira.
 */
export function Menu({ eyebrow, columns, footnote, palette, brand }: Props) {
  // Cores saem do tema da marca — cada marca já tem a sua, então o cardápio
  // acompanha sem ninguém digitar cor. `palette` sobrescreve token a token.
  const t = brand.theme;
  const vars: Record<string, string> = {
    "--menu-bg":        palette?.bg       ?? t.bg,
    "--menu-ink":       palette?.ink      ?? t.ink,
    "--menu-muted":     palette?.muted    ?? t.inkMut,
    "--menu-accent":    palette?.accent   ?? t.lavender,
    "--menu-panel-bg":  palette?.panelBg  ?? t.bgCard,
    "--menu-panel-ink": palette?.panelInk ?? t.ink,
    "--menu-gold":      palette?.gold     ?? t.lavenderSoft,
    "--menu-green":     palette?.green    ?? t.emerald,
  };

  return (
    <section className="menu" style={vars as React.CSSProperties}>
      <header className="menu__head">
        {eyebrow && <span className="menu__eyebrow">{eyebrow}</span>}
        <Image
          className="menu__logo"
          src={brand.logo.src}
          alt={brand.logo.alt}
          width={190}
          height={40}
          priority={false}
        />
      </header>

      <div className="menu__cols">
        {(columns ?? []).map((col, ci) => (
          <div key={ci} className={`menu__col${col?.variant === "panel" ? " menu__col--panel" : ""}`}>
            {(col?.sections ?? []).map((sec, si) => {
              const items = sec?.items ?? [];
              const inlineItems = sec?.inlineItems ?? [];
              const heading = sec?.heading ?? "ornament";
              const accent = sec?.accent ?? "accent";
              const titleNode = (
                <>
                  {sec?.title}
                  {sec?.titleEmphasis && <em> {sec.titleEmphasis}</em>}
                </>
              );

              return (
                <div key={si} className={`menu-sec menu-sec--${accent}`}>
                  {heading === "ornament" ? (
                    <div className="menu-sec__head">
                      <Ornament />
                      <h3 className="menu-sec__title">{titleNode}</h3>
                      <Ornament />
                    </div>
                  ) : (
                    <h3 className="menu-sec__title menu-sec__title--plain">{titleNode}</h3>
                  )}

                  {sec?.subtitle && <p className="menu-sec__sub">{sec.subtitle}</p>}
                  {sec?.intro && <p className="menu-sec__intro">{sec.intro}</p>}

                  {items.length > 0 && (
                    <ul className="menu-sec__list">
                      {items.map((item, ii) => (
                        <li key={ii} className="menu-item">
                          <div className="menu-item__row">
                            <span className="menu-item__name">
                              {item?.name}
                              {item?.qty && <span className="menu-item__qty"> {item.qty}</span>}
                            </span>
                            {item?.price && (
                              <>
                                <span className="menu-item__lead" aria-hidden="true" />
                                <Price value={item.price} />
                              </>
                            )}
                          </div>
                          {item?.description && <p className="menu-item__desc">{item.description}</p>}
                          {item?.note && (
                            <p className="menu-item__note">
                              {item.noteLabel && <em className="menu-item__note-label">{item.noteLabel} </em>}
                              {item.note}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {inlineItems.length > 0 && (
                    <p className="menu-sec__inline">{inlineItems.join("  ·  ")}</p>
                  )}

                  {sec?.footnote && <p className="menu-sec__foot">{sec.footnote}</p>}
                </div>
              );
            })}

          </div>
        ))}
      </div>

      {footnote && <p className="menu__foot">{footnote}</p>}
    </section>
  );
}
