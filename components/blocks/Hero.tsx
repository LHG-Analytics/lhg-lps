"use client";
import { useEffect, useRef, useState } from "react";
import type { Brand, HeroBlockProps } from "@/lib/schema";
import { asset } from "@/lib/asset";

type Props = HeroBlockProps & { brand: Brand };

type TwState = { before: string; em: string; after: string };

/**
 * Hero — vídeo de fundo + typewriter no h1 com ciclo de 4s.
 *
 * Comportamento espelha o HTML original:
 *   - SSR renderiza o texto completo (acessibilidade + no-JS).
 *   - Em hover-capable + sem reduce-motion, useEffect zera o texto e
 *     digita char por char (85±45ms), destacando a palavra `headlineEmphasis`
 *     com `<em>` (gradient lavanda do CSS .display em).
 *   - Após escrever, espera 4s e reinicia o ciclo.
 */
export function Hero({
  video,
  poster,
  eyebrow,
  headlineFull,
  headlineEmphasis,
  typewriter,
  subtitle,
  primaryCta,
  meta,
  brand,
}: Props) {
  const tw = useTypewriter(headlineFull, headlineEmphasis, typewriter ?? false);
  const decorativeMark = brand.name.charAt(0);
  const posterSrc = poster ? asset(poster) : undefined;

  return (
    <section className="hero" id="top">
      {posterSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterSrc}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="sync"
          className="hero__poster"
        />
      )}
      <video
        className="hero__video"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={posterSrc}
        aria-hidden="true"
      >
        <source src={asset(video.replace(/\.mp4$/i, ".webm"))} type="video/webm" />
        <source src={asset(video)} type="video/mp4" />
      </video>
      <div className="hero__bg" />
      <div className="hero__grain" />
      <span className="hero__mark" aria-hidden="true">
        {decorativeMark}
      </span>

      <div className="wrap hero__inner">
        <div className="hero__copy fade-up">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="display">
            <span
              className={`typewriter${tw.done ? " done" : ""}`}
              aria-label={headlineFull}
            >
              {tw.text.before}
              {tw.text.em ? <em>{tw.text.em}</em> : null}
              {tw.text.after}
            </span>
          </h1>
          <p className="hero__sub">{subtitle}</p>
          <div className="hero__ctas">
            <a href={primaryCta.href} className="btn btn--gold">
              {primaryCta.label}
              <ArrowRight />
            </a>
          </div>
          <div className="hero__meta">
            {meta.map((m) => (
              <div key={m.label}>
                <span>{m.label}</span>
                <strong>
                  <MetaValue value={m.value} highlight={m.highlight} />
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetaValue({ value, highlight }: { value: string; highlight?: string }) {
  if (!highlight) return <>{value}</>;
  const idx = value.indexOf(highlight);
  if (idx < 0) return <>{value}</>;
  return (
    <>
      {value.slice(0, idx)}
      <span>{highlight}</span>
      {value.slice(idx + highlight.length)}
    </>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useTypewriter(full: string, emphasis: string, enabled: boolean) {
  const [text, setText] = useState<TwState>(() => initialFullState(full, emphasis));
  const [done, setDone] = useState(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setText(initialFullState(full, emphasis));
      setDone(true);
      return;
    }

    cancelledRef.current = false;
    const emStart = full.lastIndexOf(emphasis);
    const emEnd = emStart >= 0 ? emStart + emphasis.length : full.length;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const runCycle = () => {
      if (cancelledRef.current) return;
      let i = 0;
      setDone(false);
      const step = () => {
        if (cancelledRef.current) return;
        const beforeEnd = emStart < 0 ? Math.min(i, full.length) : Math.min(i, emStart);
        const midEnd = emStart < 0 ? 0 : Math.min(i, emEnd);
        setText({
          before: full.slice(0, beforeEnd),
          em: emStart >= 0 && midEnd > emStart ? full.slice(emStart, midEnd) : "",
          after: emStart >= 0 && i > emEnd ? full.slice(emEnd, i) : "",
        });
        if (i > full.length) {
          setDone(true);
          timer = setTimeout(runCycle, 4000);
          return;
        }
        i++;
        timer = setTimeout(step, 85 + Math.random() * 45);
      };
      step();
    };

    timer = setTimeout(runCycle, 600);
    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [full, emphasis, enabled]);

  return { text, done };
}

function initialFullState(full: string, emphasis: string): TwState {
  const idx = full.lastIndexOf(emphasis);
  if (idx < 0) return { before: full, em: "", after: "" };
  return {
    before: full.slice(0, idx),
    em: emphasis,
    after: full.slice(idx + emphasis.length),
  };
}
