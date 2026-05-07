import type { CSSProperties } from "react";
import type { Brand } from "@/lib/schema";

/**
 * Converte `brand.theme` num objeto de CSS variables consumível pelo `style`
 * de qualquer wrapper. As chaves aqui DEVEM espelhar os nomes usados nos
 * estilos portados do HTML original (`--bg`, `--lav`, etc.) — se renomear
 * uma var em `globals.css`, atualize esta tabela.
 *
 * `gold-*` é alias intencional de `lav-*` para preservar a compatibilidade
 * com classes legadas (`.btn--gold`, `--shadow-gold`) que já vivem no CSS
 * portado.
 */
export function themeStyle(theme: Brand["theme"]): CSSProperties {
  return {
    "--bg": theme.bg,
    "--bg-elev": theme.bgElev,
    "--bg-card": theme.bgCard,
    "--line": theme.line,
    "--line-soft": theme.lineSoft,
    "--ink": theme.ink,
    "--ink-mut": theme.inkMut,
    "--ink-dim": theme.inkDim,
    "--lav": theme.lavender,
    "--lav-soft": theme.lavenderSoft,
    "--lav-deep": theme.lavenderDeep,
    "--lav-grad": theme.lavenderGrad,
    "--green": theme.green,
    "--green-deep": theme.greenDeep,
    "--red": theme.red,
    "--red-deep": theme.redDeep,
    "--emerald": theme.emerald,
    "--emerald-soft": theme.emeraldSoft,
    "--emerald-deep": theme.emeraldDeep,
    "--emerald-grad": theme.emeraldGrad,
    "--gold": theme.lavender,
    "--gold-soft": theme.lavenderSoft,
    "--gold-deep": theme.lavenderDeep,
    "--gold-grad": theme.lavenderGrad,
    "--lav-bright": theme.lavBright,
    "--ink-deep": theme.inkDeep,
  } as CSSProperties;
}
