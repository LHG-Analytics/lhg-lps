"use client";
import { useEffect, useState } from "react";
import type { OfferBlockProps } from "@/lib/schema";
import { TypewriterHTML } from "@/components/TypewriterHTML";

/**
 * Offer — countdown ticking + neon spinning border.
 *
 *   - O `headlineHtml` carrega `<em>` (gradient lavanda) e `<br>` —
 *     renderizado via dangerouslySetInnerHTML (fonte é JSON do repo).
 *   - O `headlineFull` é a versão acessível (aria-label).
 *   - A borda neon é puro CSS (@property --neon-angle + conic-gradient
 *     animado) — zero JS aqui.
 */
export function Offer({
  eyebrow,
  headlineFull,
  headlineHtml,
  subtitle,
  countdownTo,
  ctas,
  note,
}: OfferBlockProps) {
  const cd = useCountdown(countdownTo);

  return (
    <section className="offer">
      <div className="offer__bg" />
      <div className="wrap">
        <div className="offer__inner reveal reveal--scale">
          <span className="eyebrow" style={{ justifyContent: "center", display: "flex" }}>
            {eyebrow}
          </span>
          <TypewriterHTML html={headlineHtml} ariaLabel={headlineFull} />
          <p className="offer__sub">{subtitle}</p>

          <div className="offer__count" aria-live="polite">
            <CountBox value={cd.d} label="Dias" />
            <CountBox value={cd.h} label="Horas" />
            <CountBox value={cd.m} label="Min" />
            <CountBox value={cd.s} label="Seg" />
          </div>

          <div className="offer__cta">
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
          </div>
          <div className="offer__note">{note}</div>
        </div>
      </div>
    </section>
  );
}

function CountBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="count-box">
      <b suppressHydrationWarning>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function useCountdown(target: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const t = new Date(target).getTime();
  const diff = Math.max(0, t - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return {
    d: pad(d),
    h: pad(h),
    m: pad(m),
    s: pad(s),
  };
}

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}
