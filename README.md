# LHG-LPs

Landing pages do **Lush Hotel Group** — multi-marca, multi-campanha, todas servidas por uma única aplicação Next.js. Cada LP é uma campanha (Dia dos Namorados, Páscoa, Black Friday…) que afunila o usuário direto para o checkout institucional em `lushmotel.com.br/pt-BR/{unit}/{categorySlug}/schedule?date=…&period=…` com tudo pré-preenchido.

## Quickstart

```bash
npm install
npm run dev
# abre http://localhost:3000/lush/namorados
```

Outros comandos:

| Comando            | O que faz                                                  |
| ------------------ | ---------------------------------------------------------- |
| `npm run dev`      | Dev server (Turbopack)                                     |
| `npm run build`    | Build de produção                                          |
| `npm run lint`     | ESLint                                                     |
| `npm run typecheck`| `tsc --noEmit`                                             |
| `npm run validate` | Roda Zod em todo `content/**.json` — gate principal de CI  |

## Adicionar uma campanha nova

1. Criar `content/<brand>/campaigns/<slug>.json` seguindo o schema `Campaign` em [lib/schema.ts](lib/schema.ts).
2. Mover assets para `public/brands/<brand>/<slug>/` e referenciar por path absoluto no JSON.
3. Rodar `npm run validate`.
4. Abrir PR — preview Vercel automaticamente em `/<brand>/<slug>`.

Para um **subdomínio próprio** (ex.: `paskoa.lushmotel.com.br`), adicionar uma regra em [vercel.json](vercel.json):

```jsonc
{
  "source": "/:path*",
  "has": [{ "type": "host", "value": "paskoa.lushmotel.com.br" }],
  "destination": "/lush/paskoa/:path*"
}
```

E configurar o domínio no painel do projeto Vercel.

## Adicionar uma marca nova

1. Criar `content/<brandId>/brand.json` com o schema `Brand`.
2. Tema (`brand.theme`) é injetado como CSS vars — sem rebuild.
3. Assets em `public/brands/<brandId>/`.

## Adicionar um bloco novo

1. Estender o discriminated union em [lib/schema.ts](lib/schema.ts).
2. Criar `components/blocks/<Block>.tsx` (Server por default; `"use client"` só se houver estado).
3. Plugar em [components/BlockRenderer.tsx](components/BlockRenderer.tsx). O switch é exhaustive — TS reclama se faltar.

## Variáveis de ambiente

```
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_META_PIXEL_ID=
```

Vazias = trackers não renderizam. Configurar no painel da Vercel para preview/produção.

## Stack

- **Next.js 16** (App Router) + Turbopack
- **TypeScript** estrito
- **Tailwind v4** (config-by-CSS via `@theme`)
- **Zod** para todos os JSONs de conteúdo
- **next/font/google** (Inter, Fraunces, Cormorant Garamond)
- Deploy: **Vercel**

## Estrutura

```
app/                            App Router
  [brand]/[campaign]/page.tsx   SSG; lê content/, injeta tema, renderiza blocos
  globals.css                   tokens + reset + estilos portados do HTML
  layout.tsx                    fontes + analytics
components/
  BlockRenderer.tsx             type → componente (switch exhaustive)
  blocks/                       um arquivo por type
  RevealManager.tsx             IntersectionObserver pra .reveal/.fade-up
content/
  <brand>/brand.json            Marca (tema, fontes, unidades, booking)
  <brand>/campaigns/<slug>.json Campanha (meta, lots, periods, dates, blocks)
lib/
  schema.ts                     Zod (Brand, Campaign, Block)
  content.ts                    getBrand/getCampaign/getAllCampaigns
  lots.ts                       getActiveLot(today, lots)
  booking.ts                    buildBookingUrl(...)
  theme.ts                      brand.theme → CSS vars
  amenities.tsx                 ICONS + LABELS dos chips de comodidade
public/brands/<brand>/<asset>   Imagens, vídeos, logos
scripts/validate-content.ts     CI gate
vercel.json                     Rewrites de subdomínio
```

Detalhes de convenções, regras (zero hardcode em componente etc.) e onde NÃO mexer estão em [CLAUDE.md](CLAUDE.md).
