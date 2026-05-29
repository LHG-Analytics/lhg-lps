"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import type { Brand, NavBlockProps } from "@/lib/schema";

type Props = NavBlockProps & { brand: Brand };

/**
 * Nav — Client Component (precisa do scroll listener pra trocar pra
 * `.scrolled` quando passa de 20px). O `tag` vem do JSON num formato
 * `<emphasis> · <resto>`; o primeiro segmento ganha negrito (que o CSS
 * pinta de `--gold`).
 */
export function Nav({ tag, brand }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [emphasis, ...rest] = tag.split(" · ");
  const remainder = rest.join(" · ");

  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`} id="nav">
      <div className="wrap nav__inner">
        <a href="#top" className="logo" aria-label={brand.logo.alt}>
          <Image
            src={brand.logo.src}
            alt={brand.logo.alt}
            width={140}
            height={22}
            className="logo__mark"
            style={{ width: "auto" }}
            priority
          />
        </a>
        <div className="nav__cta">
          <span className="nav__tag">
            {emphasis ? <b>{emphasis}</b> : null}
            {remainder ? ` · ${remainder}` : ""}
          </span>
        </div>
      </div>
    </header>
  );
}
