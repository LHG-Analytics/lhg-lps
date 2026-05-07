"use client";
import { useEffect } from "react";

/**
 * Espelha o IntersectionObserver do HTML original: adiciona `.in` em
 * elementos com `.reveal` ou `.fade-up` quando entram no viewport.
 * Também distribui `--i` em filhos de `[data-stagger]` pra que os
 * delays escalonem (controlados via `--stagger-step` no CSS).
 *
 * Roda uma vez por mount. Os blocos são Server Components — este
 * Client Component fica solto no `app/[brand]/[campaign]/page.tsx`
 * e observa o DOM já hidratado.
 */
export function RevealManager() {
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-stagger]").forEach((parent) => {
      const kids = parent.querySelectorAll<HTMLElement>(
        ":scope > .reveal, :scope > .fade-up"
      );
      kids.forEach((el, i) => el.style.setProperty("--i", String(i)));
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    document.querySelectorAll<HTMLElement>(".fade-up, .reveal").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add("in");
      } else {
        io.observe(el);
      }
    });

    return () => io.disconnect();
  }, []);

  return null;
}
