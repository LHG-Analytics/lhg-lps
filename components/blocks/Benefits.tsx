import type { ReactNode } from "react";
import type { BenefitsBlockProps } from "@/lib/schema";
import { TypewriterHTML } from "@/components/TypewriterHTML";

/**
 * Mapa de ícones consumidos pelos benefits. Schema (`BenefitsBlock`)
 * já restringe `icon` a um destes literais via `z.enum`, então TS reclama
 * se o JSON pedir um ícone novo sem registro aqui.
 *
 * Ícones extraídos 1:1 do HTML de referência (mesmas paths/strokes).
 */
const ICON_BODY: Record<BenefitsBlockProps["items"][number]["icon"], ReactNode> = {
  heart: (
    <path d="M12 21s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z" />
  ),
  calendar: (
    <path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
  ),
  champagne: (
    <>
      <path d="M3 12l3-9h12l3 9M3 12v8h18v-8M3 12h18" />
      <path d="M8 12v4M12 12v4M16 12v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
};

export function Benefits({
  eyebrow,
  headlineFull,
  headlineEmphasis,
  items,
}: BenefitsBlockProps) {
  const headlineHtml = composeEmphasisHtml(headlineFull, headlineEmphasis);

  return (
    <section className="benefits">
      <div className="wrap">
        <div className="section-head fade-up">
          <span className="eyebrow">{eyebrow}</span>
          <TypewriterHTML html={headlineHtml} ariaLabel={headlineFull} />
        </div>
        <div
          className="benefits__grid"
          data-stagger
          style={{ "--stagger-step": "110ms" } as React.CSSProperties}
        >
          {items.map((item) => (
            <div key={item.title} className="benefit reveal reveal--rise">
              <div className="benefit__icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                >
                  {ICON_BODY[item.icon]}
                </svg>
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function composeEmphasisHtml(full: string, em: string): string {
  const idx = full.indexOf(em);
  if (idx < 0) return escape(full);
  return (
    escape(full.slice(0, idx)) +
    "<em>" +
    escape(em) +
    "</em>" +
    escape(full.slice(idx + em.length))
  );
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
