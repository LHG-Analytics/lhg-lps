import Link from "next/link";
import Image from "next/image";
import type { Brand, FooterBlockProps } from "@/lib/schema";

type Props = FooterBlockProps & { brand: Brand };

/**
 * Footer — Server Component.
 *
 * Migrado fielmente do HTML de referência (.footer / .footer__grid /
 * .footer__brand / .footer__bottom). Copy/links/copyright/ageNotice vêm
 * do JSON da campanha; logo vem do `brand.json` (zero hardcode aqui).
 */
export function Footer({
  tagline,
  columns,
  copyright,
  ageNotice,
  brand,
}: Props) {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="logo">
              <Image
                src={brand.logo.src}
                alt={brand.logo.alt}
                width={140}
                height={28}
                className="logo__mark"
                priority={false}
              />
            </div>
            <p>{tagline}</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    {isExternal(link.href) ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href as never}>{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer__bottom">
          <span>{copyright}</span>
          <span>{ageNotice}</span>
        </div>
      </div>
    </footer>
  );
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
