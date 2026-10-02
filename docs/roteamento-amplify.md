# Roteamento por domínio — Amplify → Vercel

Como uma URL pública como `altanamotel.com.br/campanhas/cardapio` chega à LP certa, quem configura o quê, e como diagnosticar quando um domínio mostra a LP de outra marca.

> Padrão em vigor desde 2026-08-17 (commit `ccfaa33`). Documentado após o incidente de 2026-10-01, em que `altanamotel.com.br/campanhas/cardapio` exibia o cardápio do Lush.

## Quem configura o quê

| Camada | Responsável | O que faz |
|---|---|---|
| Apex da marca (`lushmotel.com.br`, `toutmotel.com.br`, `andardecimasuites.com.br`, `altanamotel.com.br`, `lemonmotel.com.br`) | Softo, no Amplify (CloudFront) | Hospeda o site institucional Next (redirect de idioma para `/pt-BR`) e mantém **uma regra de rewrite por domínio** levando `/campanhas/*` para este app, com a marca embutida no Target. |
| `lhg-lps.vercel.app` (este app) | LHG CMS | `proxy.ts` + rota `app/[brand]/[campaign]` resolvem marca e campanha a partir do **primeiro segmento do path** e do slug. Conteúdo vem do Supabase (campanha `published`) com fallback no JSON em `content/`. |
| Subdomínios atribuídos à Vercel (`campanha.altanamotel.com.br`, `campanhas.lemonmotel.com.br`, `diadosnamorados.lushmotel.com.br`) | DNS pela marca (CNAME para a Vercel) + domínio adicionado ao projeto pelo DeployPanel | Único cenário em que o host chega real e a lógica de host do proxy (`custom_domain`, `campanhas_domain` + `path_slug`, sufixo de `brands.domain`) está viva. |

## A regra do Amplify (Hosting → Rewrites and redirects)

| Campo | Valor |
|---|---|
| Source address | `/campanhas/<*>` |
| Target address | `https://lhg-lps.vercel.app/<brand_id>/<*>` (ex.: `https://lhg-lps.vercel.app/altana/<*>`) |
| Type | `200 (Rewrite)` |
| Country code | vazio |

Regras que não podem ser quebradas:

- **A marca precisa vir no primeiro segmento do path.** O Amplify sobrescreve o `Host` pelo hostname da Vercel e a Vercel sobrescreve `x-forwarded-host` com o host que chegou nela. Nenhum header carrega o domínio original (sonda de 2026-08-17, commits `be0cf97` e `9cab32f`). Uma regra genérica, com Target `https://lhg-lps.vercel.app/campanhas/<*>`, foi testada nesse dia e descartada: toda requisição chega indistinguível e o proxy entrega a primeira campanha publicada com aquele `base_path`, de qualquer marca.
- O `<*>` captura só o que vem depois de `/campanhas/`. O Target **não** repete `campanhas`: um Target `/altana/campanhas/<*>` produz `/altana/campanhas/cardapio`, três segmentos, 404.
- No Amplify a primeira regra que casa vence: editar a existente, não duplicar. Se houver regra para `/pt-BR/campanhas/<*>`, ela precisa do mesmo Target.
- A mudança vale sem novo deploy do Amplify, mas pode levar alguns minutos para propagar.
- `<brand_id>` é `brands.id` no Supabase e o nome da pasta em `content/<brand_id>/` (minúsculas: `lush`, `tout`, `andardecima`, `altana`, `lemon`).

Do lado do app, nada é configurado por campanha depois da regra do domínio: `proxy.ts` traduz `/<brand>/<segmento>` para o slug real via `brandPathMap` quando o `base_path` público difere do slug (ex.: `/campanhas/menu-de-inverno` → slug `inverno`). A lista `CAMPANHAS_WILDCARD_DOMAINS` em `app/admin/campaigns/[id]/DeployPanel.tsx` espelha os domínios que já têm a regra e deve ser atualizada ao habilitar uma marca nova.

## Match aberto (fallback) e seu risco

Quando o host não é de nenhuma marca (`lhg-lps.vercel.app`, `localhost`, ou uma regra de Amplify sem a marca), o proxy casa o `base_path` sem filtrar por marca e escolhe a primeira campanha publicada na ordem em que o Supabase devolve as linhas. Serve para preview no domínio da Vercel. Se uma regra de CDN estiver no formato antigo, é esse fallback que faz um domínio mostrar a LP de outra marca. Não feche esse match sem antes confirmar que todas as regras embutem a marca.

## Roteiro de diagnóstico (de fora, sem acesso ao Amplify)

1. Ler a rota interna que o Next executou:
   ```bash
   curl -sD - -o /dev/null "https://<dominio>/campanhas/<slug>?cb=$(date +%s)" | grep -iE 'HTTP/|x-matched-path|x-cache'
   ```
   `x-matched-path: /altana/cardapio` está certo; `/lush/cardapio` em domínio de outra marca indica regra sem marca; `/404` indica path com segmentos a mais ou a menos. `X-Cache: Miss/Error from cloudfront` com cache-buster descarta cache.
2. Pedir um slug que só existe no Lush, por exemplo `/campanhas/inverno` (o `base_path` público é `/campanhas/menu-de-inverno`): 200 só acontece se o Target embute `/lush/`; qualquer outro formato dá 404.
3. Pedir a URL com barra final (`/campanhas/<slug>/`): o Next responde 308 e o `Location` expõe o path reescrito que chegou à Vercel. Foi assim que `/altana/campanhas/cardapio` revelou o `campanhas` sobrando no Target.
4. Os headers `x-lhg-host` e `x-lhg-route` que o proxy seta em rewrites não chegam ao cliente pela Vercel. Não servem para depurar de fora.

## Alternativas avaliadas e descartadas (2026-10-01)

- Ler o host original na Vercel: impossível, `x-forwarded-host` é sobrescrito e nenhum outro header o carrega.
- Header customizado adicionado pela regra: o Amplify não adiciona headers à requisição em regras de rewrite; só o CloudFront puro permite "origin custom headers", o que exigiria um origin por marca e código no proxy.
- Regra idêntica para todas as marcas: impossível, porque a origem recebe requisições iguais e nada no app distingue a marca sem path, host ou header diferente.
- Subdomínio por marca (`campanha.<marca>.com.br/<path_slug>`): já implementado e funciona só com dados no CMS, ao custo de a URL sair do apex.
