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

export function Menu({ eyebrow, title, columns, footnote, palette, brand }: Props) {
  // Paleta do cardápio vira CSS var; ausente herda o default do globals.css.
  const paletteVars = palette
    ? (Object.fromEntries(
        Object.entries(palette)
          .filter(([, v]) => v)
          .map(([k, v]) => [`--menu-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, v])
      ) as React.CSSProperties)
    : undefined;

  return (
    <section className="menu" style={paletteVars}>
      <header className="menu__head">
        {eyebrow && <span className="menu__eyebrow">{eyebrow}</span>}
        <h2 className="menu__title">{title || brand.name}</h2>
      </header>

      <div className="menu__cols">
        {columns.map((col, ci) => (
          <div key={ci} className={`menu__col${col.variant === "panel" ? " menu__col--panel" : ""}`}>
            {col.sections.map((sec, si) => (
              <div key={si} className={`menu-sec menu-sec--${sec.accent}`}>
                {sec.heading === "ornament" ? (
                  <div className="menu-sec__head">
                    <Ornament />
                    <h3 className="menu-sec__title">
                      {sec.title}
                      {sec.titleEmphasis && <em> {sec.titleEmphasis}</em>}
                    </h3>
                    <Ornament />
                  </div>
                ) : (
                  <h3 className="menu-sec__title menu-sec__title--plain">
                    {sec.title}
                    {sec.titleEmphasis && <em> {sec.titleEmphasis}</em>}
                  </h3>
                )}

                {sec.subtitle && <p className="menu-sec__sub">{sec.subtitle}</p>}
                {sec.intro && <p className="menu-sec__intro">{sec.intro}</p>}

                {sec.items.length > 0 && (
                  <ul className="menu-sec__list">
                    {sec.items.map((item, ii) => (
                      <li key={ii} className="menu-item">
                        <div className="menu-item__row">
                          <span className="menu-item__name">
                            {item.name}
                            {item.qty && <span className="menu-item__qty"> {item.qty}</span>}
                          </span>
                          {item.price && (
                            <>
                              <span className="menu-item__lead" aria-hidden="true" />
                              <Price value={item.price} />
                            </>
                          )}
                        </div>
                        {item.description && <p className="menu-item__desc">{item.description}</p>}
                        {item.note && (
                          <p className="menu-item__note">
                            {item.noteLabel && <em className="menu-item__note-label">{item.noteLabel} </em>}
                            {item.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {sec.inlineItems && sec.inlineItems.length > 0 && (
                  <p className="menu-sec__inline">
                    {sec.inlineItems.join("  ·  ")}
                  </p>
                )}

                {sec.footnote && <p className="menu-sec__foot">{sec.footnote}</p>}
              </div>
            ))}

            {col.card && (
              <div className="menu-card">
                {col.card.image && (
                  <Image
                    className="menu-card__qr"
                    src={col.card.image}
                    alt={col.card.imageAlt ?? ""}
                    width={104}
                    height={104}
                  />
                )}
                <div className="menu-card__body">
                  {col.card.lines.map((line, li) => (
                    <p key={li}>{line}</p>
                  ))}
                  {col.card.handle && <p className="menu-card__handle">{col.card.handle}</p>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {footnote && <p className="menu__foot">{footnote}</p>}
    </section>
  );
}
