import type { MenuGridBlockProps } from "@/lib/schema";

type Props = MenuGridBlockProps;

export function MenuGrid({ eyebrow, headlineFull, items, harmonization }: Props) {
  return (
    <section className="menu-grid">
      <div className="wrap">
        <div className="menu-grid__header reveal">
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="display menu-grid__headline">{headlineFull}</h2>
        </div>

        <div className="menu-grid__items">
          {items.map((item, i) => (
            <div key={i} className="menu-grid__item reveal">
              <div className="menu-grid__tag">{item.tag}</div>
              <h3 className="menu-grid__name">{item.name}</h3>
              <p className="menu-grid__desc">{item.description}</p>
            </div>
          ))}
        </div>

        {harmonization && (
          <div className="menu-grid__harmonization reveal">
            <div className="menu-grid__harm-title">{harmonization.title}</div>
            <p className="menu-grid__harm-body">{harmonization.body}</p>
          </div>
        )}
      </div>
    </section>
  );
}
