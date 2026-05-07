"use client";
import { useState } from "react";
import type { FaqBlockProps } from "@/lib/schema";

/**
 * FAQ — accordion Client. Cada item mantém seu próprio estado, permitindo
 * múltiplos abertos. As respostas (`a`) podem conter `<b>` inline (validado
 * implicitamente pelo Zod, que apenas exige string) — renderizadas via
 * dangerouslySetInnerHTML porque a fonte é o JSON do próprio repo, não input
 * de usuário.
 */
export function FAQ({
  eyebrow,
  headlineFull,
  headlineEmphasis,
  intro,
  ctaLabel,
  ctaHref,
  items,
}: FaqBlockProps) {
  const split = splitEmphasis(headlineFull, headlineEmphasis);

  return (
    <section className="faq">
      <div className="wrap">
        <div className="faq__grid">
          <div className="faq__head reveal reveal--left">
            <span className="eyebrow">{eyebrow}</span>
            <h2 className="display">
              {split.before}
              {split.em ? <em>{split.em}</em> : null}
              {split.after}
            </h2>
            <p>{intro}</p>
            {ctaLabel && ctaHref ? (
              <a href={ctaHref} className="btn btn--ghost btn--sm">
                {ctaLabel}
              </a>
            ) : null}
          </div>
          <div className="faq__list reveal reveal--right">
            {items.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button
        className="faq-item__q"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {q}
        <span className="tog">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <div className="faq-item__a">
        <div className="faq-item__a-inner" dangerouslySetInnerHTML={{ __html: a }} />
      </div>
    </div>
  );
}

function splitEmphasis(full: string, em: string) {
  const idx = full.indexOf(em);
  if (idx < 0) return { before: full, em: "", after: "" };
  return { before: full.slice(0, idx), em, after: full.slice(idx + em.length) };
}
