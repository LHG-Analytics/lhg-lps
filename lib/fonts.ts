import type { CSSProperties } from "react";

// Google Fonts axis/weight params for each supported font
const FONT_PARAMS: Record<string, string> = {
  "Fraunces":            "ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400",
  "Cormorant Garamond":  "ital,wght@0,300;0,400;0,500;1,300;1,400;1,500",
  "Playfair Display":    "ital,wght@0,400;0,500;1,400",
  "DM Serif Display":    "ital@0;1",
  "Bodoni Moda":         "ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400",
  "Cinzel":              "wght@400;500",
  "Libre Baskerville":   "ital,wght@0,400;1,400",
  "Spectral":            "ital,wght@0,300;0,400;1,300",
  "Cardo":               "ital,wght@0,400;1,400",
  "Inter":               "wght@300;400;500;600",
  "Plus Jakarta Sans":   "wght@300;400;500;600",
  "DM Sans":             "wght@300;400;500",
  "Outfit":              "wght@300;400;500",
  "Raleway":             "wght@300;400;500",
  "Nunito":              "wght@300;400;500",
  "Lato":                "ital,wght@0,300;0,400;0,700;1,400",
  "Source Sans 3":       "wght@300;400;600",
};

const SERIF_FONTS = new Set([
  "Fraunces", "Cormorant Garamond", "Playfair Display", "DM Serif Display",
  "Bodoni Moda", "Cinzel", "Libre Baskerville", "Spectral", "Cardo",
]);

function fallback(name: string): string {
  return SERIF_FONTS.has(name)
    ? "'Times New Roman', serif"
    : "system-ui, -apple-system, sans-serif";
}

/**
 * Builds a Google Fonts CSS2 API URL for the given font pair.
 * Returns null if both are undefined (nothing to load).
 */
export function buildGoogleFontsUrl(display?: string, body?: string): string | null {
  const families: string[] = [];
  const seen = new Set<string>();

  function add(name: string) {
    if (!name || seen.has(name)) return;
    seen.add(name);
    const encoded = name.replace(/ /g, "+");
    const params  = FONT_PARAMS[name] ?? "wght@300;400;500";
    families.push(`family=${encoded}:${params}`);
  }

  if (display) add(display);
  if (body)    add(body);

  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

/**
 * Returns CSS custom property overrides to apply as inline style on the LP wrapper.
 * Overrides --font-serif + --font-display (used by .display headlines) and --font-sans (body).
 */
export function fontVars(display?: string, body?: string): CSSProperties {
  const vars: Record<string, string> = {};
  if (display) {
    const val = `'${display}', ${fallback(display)}`;
    vars["--font-serif"]   = val;
    vars["--font-display"] = val;
  }
  if (body) {
    vars["--font-sans"] = `'${body}', ${fallback(body)}`;
  }
  return vars as CSSProperties;
}
