import type { StickyCtaBlockProps } from "@/lib/schema";

/**
 * StickyCta — Server Component. Aparece só abaixo de 720px (CSS) e
 * vive em `position: fixed` no rodapé. Cada CTA carrega um
 * `data-focus-unit` que será capturado pelo UnitPicker (Client) pra
 * dar lock no card respectivo ao chegar lá.
 */
export function StickyCta({ ctas }: StickyCtaBlockProps) {
  return (
    <nav className="sticky-cta" aria-label="Reservar">
      {ctas.map((cta) => (
        <a
          key={cta.label}
          href={cta.href}
          className={`btn btn--${cta.variant}`}
          data-focus-unit={cta.focusUnit}
        >
          {cta.label}
        </a>
      ))}
    </nav>
  );
}
