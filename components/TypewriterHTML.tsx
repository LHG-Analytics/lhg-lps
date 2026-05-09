"use client";
import { useEffect, useRef, useState } from "react";

type Token = { ch?: string; em?: boolean; br?: boolean };

type Props = {
  html: string;
  /** Texto plano pro aria-label (acessibilidade). Se omitido, deriva tirando as tags. */
  ariaLabel?: string;
  className?: string;
  /** Fração do elemento visível pra disparar a animação. Default 0.4. */
  threshold?: number;
};

/**
 * Replica o `[data-typewriter]` do HTML original — começa a animação
 * quando o elemento entra no viewport, e depois loopa a cada `LOOP_MS`
 * (igual ao Hero). Preserva estrutura de `<em>` e `<br>` ao longo da
 * digitação. Usado pelas headlines de Benefits, UnitPicker e Offer.
 *
 * SSR renderiza o HTML completo (bom pra SEO + primeira pintura). Após
 * hydration, useEffect monta IntersectionObserver: ao bater o threshold,
 * o conteúdo zera e re-cresce char por char. Quando termina, espera
 * `LOOP_MS` e reinicia.
 */
const LOOP_MS = 4000;
const TICK_MIN = 55;
const TICK_JITTER = 35;
export function TypewriterHTML({
  html,
  ariaLabel,
  className = "display",
  threshold = 0.4,
}: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [content, setContent] = useState(html);

  useEffect(() => {
    if (!ref.current) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setContent(html);
      return;
    }

    const tokens = tokenize(html);
    if (!tokens.length) return;

    let started = false;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const runCycle = () => {
      if (cancelled) return;
      let i = 0;
      setContent("");
      const tick = () => {
        if (cancelled) return;
        setContent(renderUntil(tokens, i));
        if (i >= tokens.length) {
          // Termina a digitação, espera LOOP_MS e reinicia.
          timer = setTimeout(runCycle, LOOP_MS);
          return;
        }
        i++;
        timer = setTimeout(tick, TICK_MIN + Math.random() * TICK_JITTER);
      };
      tick();
    };

    const start = () => {
      if (started || cancelled) return;
      started = true;
      runCycle();
    };

    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            start();
            io.unobserve(e.target);
          }
        }
      },
      { threshold }
    );
    io.observe(el);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      io.disconnect();
    };
  }, [html, threshold]);

  return (
    <h2
      ref={ref}
      className={`${className} typewriter-stack`}
      aria-label={ariaLabel ?? stripHtml(html)}
    >
      {/* Ghost: cópia hidden do HTML completo. Reserva a altura final
          desde o primeiro paint, evitando layout-shift quando o `live`
          cresce char-a-char. Ambos ocupam o mesmo grid cell. */}
      <span
        aria-hidden="true"
        className="typewriter-ghost"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <span
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </h2>
  );
}

function tokenize(html: string): Token[] {
  if (typeof document === "undefined") return [];
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const tokens: Token[] = [];

  function walk(el: Node, em: boolean) {
    el.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        for (const ch of n.textContent ?? "") tokens.push({ ch, em });
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const elem = n as Element;
        if (elem.tagName === "BR") {
          tokens.push({ br: true });
          return;
        }
        const isEm = em || elem.tagName === "EM";
        walk(n, isEm);
      }
    });
  }

  walk(tmp, false);
  return tokens;
}

function renderUntil(tokens: Token[], i: number): string {
  let html = "";
  let inEm = false;
  for (let k = 0; k < i; k++) {
    const t = tokens[k];
    if (!t) continue;
    if (t.br) {
      if (inEm) {
        html += "</em>";
        inEm = false;
      }
      html += "<br>";
      continue;
    }
    if (t.em && !inEm) {
      html += "<em>";
      inEm = true;
    } else if (!t.em && inEm) {
      html += "</em>";
      inEm = false;
    }
    const ch = t.ch ?? "";
    html +=
      ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === "&" ? "&amp;" : ch;
  }
  if (inEm) html += "</em>";
  return html;
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
