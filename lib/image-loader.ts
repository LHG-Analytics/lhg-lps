/**
 * Loader de imagem customizado.
 *
 * O loader padrão do `next/image` emite `/_next/image?…` relativo ao domínio da
 * página. As LPs são servidas nos domínios das marcas (lushmotel.com.br,
 * andardecimasuites.com.br, …) por rewrite do Amplify, e lá esse caminho não é
 * roteado — responde 400. Com o loader padrão, portanto, toda imagem quebra
 * fora do domínio da Vercel; foi por isso que os blocos usavam `unoptimized`,
 * o que desligava a otimização e fazia a página entregar o arquivo original.
 *
 * `assetPrefix` não resolve: o Next o aplica em `/_next/static`, mas não na URL
 * do otimizador (verificado no build de produção). Daí este loader, que aponta
 * o otimizador para a origem da Vercel — que atende qualquer domínio.
 */
const OPTIMIZER_ORIGIN = "https://lhg-lps.vercel.app";

interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  // SVG e data: URI não passam pelo otimizador (o Next recusa SVG por padrão).
  if (src.startsWith("data:") || src.endsWith(".svg")) return src;

  // Em desenvolvimento usa o otimizador local; apontar para produção buscaria
  // assets que ainda não existem no deploy.
  const origin = process.env.NODE_ENV === "production" ? OPTIMIZER_ORIGIN : "";

  return `${origin}/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
