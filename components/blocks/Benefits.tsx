import type { BenefitsBlockProps } from "@/lib/schema";
import { BENEFIT_ICON_PATHS } from "@/lib/benefit-icons";
import { TypewriterHTML } from "@/components/TypewriterHTML";

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
                  {BENEFIT_ICON_PATHS[item.icon]}
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
