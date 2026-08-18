import Image from "next/image";
import { asset } from "@/lib/asset";
import type { FeatureBlockProps } from "@/lib/schema";

type Props = FeatureBlockProps;

export function Feature({
  eyebrow,
  headlineFull,
  headlineEmphasis,
  body,
  image,
  imageAlt,
  imagePosition = "right",
}: Props) {
  const imgSrc = /^https?:\/\//.test(image) ? image : asset(image);

  const textSide = (
    <div className="feature__text reveal">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="display feature__headline">
        {headlineEmphasis ? buildHeadline(headlineFull, headlineEmphasis) : headlineFull}
      </h2>
      <div className="feature__body">
        {body.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </div>
  );

  const imageSide = (
    <div className="feature__img">
      <Image src={imgSrc} alt={imageAlt} fill sizes="50vw" style={{ objectFit: "cover" }} />
    </div>
  );

  return (
    <section className="feature">
      {imagePosition === "left" ? imageSide : textSide}
      {imagePosition === "left" ? textSide : imageSide}
    </section>
  );
}

function buildHeadline(full: string, emphasis: string) {
  const idx = full.lastIndexOf(emphasis);
  if (idx < 0) return <>{full}</>;
  return (
    <>
      {full.slice(0, idx)}
      <em>{emphasis}</em>
      {full.slice(idx + emphasis.length)}
    </>
  );
}
