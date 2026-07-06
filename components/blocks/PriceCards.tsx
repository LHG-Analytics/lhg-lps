import Image from "next/image";
import { asset } from "@/lib/asset";
import type { PriceCardsBlockProps } from "@/lib/schema";

type Props = PriceCardsBlockProps;

export function PriceCards({ eyebrow, headlineFull, backgroundImage, cards, availability, cta }: Props) {
  const bgSrc = backgroundImage
    ? (/^https?:\/\//.test(backgroundImage) ? backgroundImage : asset(backgroundImage))
    : null;

  return (
    <section className="price-cards" id="pacote">
      {bgSrc && (
        <Image
          src={bgSrc}
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      )}
      <div className="price-cards__overlay" />

      <div className="wrap price-cards__inner">
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="display price-cards__headline">{headlineFull}</h2>

        <div className="price-cards__grid">
          {cards.map((card, i) => (
            <div key={i} className={`price-card${card.highlight ? " price-card--highlight" : ""}`}>
              <div className="price-card__tag">{card.tag}</div>
              <div className="price-card__name">{card.name}</div>
              <div className="price-card__price">{card.price}</div>
              <div className="price-card__note">{card.note}</div>
            </div>
          ))}
        </div>

        <p className="price-cards__availability">{availability}</p>
        <a href={cta.href} className="btn btn--gold">
          {cta.label}
        </a>
      </div>
    </section>
  );
}
